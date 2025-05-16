import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import News from '../../../../../models/news.model';
import { idSchema } from '../../../../../validations/rss.validation.js'; // For param validation
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import mongoose from 'mongoose';

// Placeholder for req.user. This needs to be replaced with your actual auth logic in Next.js
const getUserIdFromRequest = async (req: NextRequest): Promise<{ userId: string | null; error?: NextResponse }> => {
    const session = await getServerSession(authOptions);
    if (!session) {
        return { userId: null, error: NextResponse.json({ message: 'Authentication required' }, { status: 401 }) };
    }
    return { userId: session.user.id };
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    await dbConnect();
    const authCheck = await getUserIdFromRequest(req);

    if (!authCheck.userId) {
        return authCheck.error || NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }
    const userId = authCheck.userId;

    try {
        const { error: idValidationError } = idSchema.validate(params.id);
        if (idValidationError) {
            return NextResponse.json({ message: 'Validation Error for ID', errors: [idValidationError.details[0].message] }, { status: 400 });
        }

        const newsItem = await News.findById(params.id);
        if (!newsItem) {
            return NextResponse.json({ message: 'News item not found' }, { status: 404 });
        }

        const isLiked = newsItem.likedBy.includes(new mongoose.Types.ObjectId(userId));
        const isDisliked = newsItem.dislikedBy.includes(new mongoose.Types.ObjectId(userId));

        let updateQuery = {};
        if (isDisliked) { // Already disliked, so un-dislike
            updateQuery = { $inc: { dislikes: -1 }, $pull: { dislikedBy: userId } };
        } else if (isLiked) { // Was liked, change to dislike
            updateQuery = { $inc: { dislikes: 1, likes: -1 }, $pull: { likedBy: userId }, $addToSet: { dislikedBy: userId } };
        } else { // New dislike
            updateQuery = { $inc: { dislikes: 1 }, $addToSet: { dislikedBy: userId } };
        }

        await News.updateOne({ _id: params.id }, updateQuery);
        const updatedNews = await News.findById(params.id).select('likes dislikes likedBy dislikedBy');

        return NextResponse.json({
            message: 'News dislike status updated successfully',
            likes: updatedNews?.likes,
            dislikes: updatedNews?.dislikes,
        });

    } catch (err: any) {
        console.error(`Error disliking news item ${params.id}:`, err);
        if (err.name === 'CastError') return NextResponse.json({ message: 'Invalid news ID format' }, { status: 400 });
        return NextResponse.json({ message: 'Error disliking news item', error: err.message }, { status: 500 });
    }
} 