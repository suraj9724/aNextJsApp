import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import News from '../../../../../models/news.model';
import { idSchema } from '../../../../../validations/rss.validation';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import mongoose, { Types } from 'mongoose';

interface ReactionRequestBody {
    reactionType: 'like' | 'dislike';
}

const getUserIdFromRequest = async (req: NextRequest): Promise<{ userId: string | null; error?: NextResponse }> => {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        return { userId: null, error: NextResponse.json({ message: 'Authentication required or user ID missing' }, { status: 401 }) };
    }
    return { userId: session.user.id };
};

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    await dbConnect();
    const authCheck = await getUserIdFromRequest(req);

    if (!authCheck.userId) {
        return authCheck.error || NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    let requestBody: ReactionRequestBody;
    try {
        requestBody = await req.json();
    } catch (e) {
        return NextResponse.json({ message: 'Invalid request body: Must be JSON' }, { status: 400 });
    }

    const { reactionType } = requestBody;

    if (reactionType !== 'like' && reactionType !== 'dislike') {
        return NextResponse.json({ message: 'Invalid reactionType. Must be "like" or "dislike".' }, { status: 400 });
    }

    let userIdString: string | null = null;

    try {
        const { id: newsIdFromParams } = params;

        const { error: idValidationError } = idSchema.validate(newsIdFromParams);
        if (idValidationError) {
            return NextResponse.json({ message: 'Validation Error for ID', errors: [idValidationError.details[0].message] }, { status: 400 });
        }

        userIdString = authCheck.userId;
        const newsId = newsIdFromParams;
        if (!userIdString) {
            console.error('User ID string is null after auth check in reaction API');
            return NextResponse.json({ message: 'User ID is missing after authentication check.' }, { status: 500 });
        }
        const userIdObj = new Types.ObjectId(userIdString);

        const newsItem = await News.findById(newsId);
        if (!newsItem) {
            return NextResponse.json({ message: 'News item not found' }, { status: 404 });
        }

        const isCurrentlyLiked = newsItem.likedBy.some(id => id.equals(userIdObj));
        const isCurrentlyDisliked = newsItem.dislikedBy.some(id => id.equals(userIdObj));

        const updateQuery: any = {};
        const increments: any = {};
        const pulls: any = {};
        const addToSets: any = {};

        let newHasLiked = isCurrentlyLiked;
        let newHasDisliked = isCurrentlyDisliked;

        if (reactionType === 'like') {
            if (isCurrentlyLiked) { // User is unliking
                pulls.likedBy = userIdObj;
                increments.likes = -1;
                newHasLiked = false;
            } else { // User is liking (or switching from dislike)
                addToSets.likedBy = userIdObj;
                increments.likes = 1;
                newHasLiked = true;
                if (isCurrentlyDisliked) { // Switching from dislike to like
                    pulls.dislikedBy = userIdObj;
                    increments.dislikes = -1;
                    newHasDisliked = false;
                }
            }
        } else if (reactionType === 'dislike') {
            if (isCurrentlyDisliked) { // User is un-disliking
                pulls.dislikedBy = userIdObj;
                increments.dislikes = -1;
                newHasDisliked = false;
            } else { // User is disliking (or switching from like)
                addToSets.dislikedBy = userIdObj;
                increments.dislikes = 1;
                newHasDisliked = true;
                if (isCurrentlyLiked) { // Switching from like to dislike
                    pulls.likedBy = userIdObj;
                    increments.likes = -1;
                    newHasLiked = false;
                }
            }
        }

        if (Object.keys(increments).length > 0) updateQuery.$inc = increments;
        if (Object.keys(pulls).length > 0) updateQuery.$pull = pulls;
        if (Object.keys(addToSets).length > 0) updateQuery.$addToSet = addToSets;

        if (Object.keys(updateQuery).length === 0) {
            // Should not happen with current logic, but as a safeguard
            return NextResponse.json({
                success: true,
                message: 'No change in reaction state.',
                data: {
                    likes: newsItem.likes,
                    dislikes: newsItem.dislikes,
                    hasLiked: isCurrentlyLiked,
                    hasDisliked: isCurrentlyDisliked
                }
            });
        }

        const updatedNews = await News.findOneAndUpdate(
            { _id: newsId },
            updateQuery,
            { new: true, runValidators: true }
        )
        // .populate('likedBy', 'name email') // Optional: client might not need full arrays
        // .populate('dislikedBy', 'name email'); // Optional

        if (!updatedNews) {
            // This might happen if the newsItem was deleted between findById and findOneAndUpdate
            // Or if runValidators failed and new:false (though we use new:true)
            return NextResponse.json({ message: 'Failed to update news item reaction. Item might have been modified or deleted.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Reaction updated successfully',
            data: {
                likes: updatedNews.likes,
                dislikes: updatedNews.dislikes,
                hasLiked: newHasLiked, // Reflects the new state after the operation
                hasDisliked: newHasDisliked // Reflects the new state after the operation
            }
        });

    } catch (err: any) {
        const idForErrorLog = params?.id || 'unknown_id_due_to_early_error';
        console.error(`Error updating reaction for news item ${idForErrorLog} by user ${userIdString || 'unknown_user'}:`, err);

        if (err instanceof mongoose.Error.CastError) {
            if (userIdString && err.path === '_id' && err.kind === 'ObjectId' && err.value === userIdString) {
                return NextResponse.json({ message: `Invalid User ID format for ObjectId conversion: ${userIdString}` }, { status: 400 });
            }
            return NextResponse.json({ message: `Invalid ID format. News ID: ${idForErrorLog}. Error: ${err.message}` }, { status: 400 });
        }
        return NextResponse.json({ message: 'Error updating reaction', error: err.message }, { status: 500 });
    }
} 