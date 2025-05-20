import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import News from '../../../../../models/news.model';
import { idSchema } from '../../../../../validations/rss.validation';
import { authOptions } from '../../../auth/auth.config';
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
    { params }: { params: Promise<{ id: string }> } // Treat params as a Promise
) {
    // First get the newsId from params
    const newsId = (await params).id;

    if (!newsId) {
        return NextResponse.json({ message: 'News ID is required' }, { status: 400 });
    }

    try {
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

        const { error: idValidationError } = idSchema.validate(newsId);
        if (idValidationError) {
            return NextResponse.json({ message: 'Validation Error for ID', errors: [idValidationError.details[0].message] }, { status: 400 });
        }

        userIdString = authCheck.userId;
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
        );

        if (!updatedNews) {
            return NextResponse.json({ message: 'Failed to update news item reaction. Item might have been modified or deleted.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Reaction updated successfully',
            data: {
                likes: updatedNews.likes,
                dislikes: updatedNews.dislikes,
                hasLiked: newHasLiked,
                hasDisliked: newHasDisliked
            }
        });

    } catch (err: any) {
        console.error(`Error updating reaction:`, err);

        if (err instanceof mongoose.Error.CastError) {
            return NextResponse.json({ message: `Invalid ID format. Error: ${err.message}` }, { status: 400 });
        }
        return NextResponse.json({ message: 'Error updating reaction', error: err.message }, { status: 500 });
    }
}