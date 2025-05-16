import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import News from '../../../../../models/news.model.js';
import Comment from '../../../../../models/comment.model.js';
import { idSchema } from '../../../../../validations/rss.validation.js'; // For newsId param validation
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

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
        return authCheck.error || NextResponse.json({ message: 'Authentication required to comment' }, { status: 401 });
    }
    const userId = authCheck.userId;
    const newsId = params.id;

    try {
        const { error: idValidationError } = idSchema.validate(newsId);
        if (idValidationError) {
            return NextResponse.json({ message: 'Validation Error for News ID', errors: [idValidationError.details[0].message] }, { status: 400 });
        }

        const body = await req.json();
        const { comment: commentText } = body;

        if (!commentText || String(commentText).trim() === '') {
            return NextResponse.json({ message: 'Comment text is required' }, { status: 400 });
        }

        const newsItem = await News.findById(newsId);
        if (!newsItem) {
            return NextResponse.json({ message: 'News item not found' }, { status: 404 });
        }

        const newComment = new Comment({
            newsId,
            comment: String(commentText).trim(),
            userId,
        });

        await newComment.save();

        // Add comment reference to news (original controller does this)
        // newsItem.comments.push(newComment._id); // Make sure 'comments' field in News model is an array of ObjectId
        // await newsItem.save(); // This might be redundant if you only query Comments by newsId
        // For simplicity and to avoid potential race conditions if many comments are added, 
        // it's often better to just store newsId in Comment and query by that.
        // If you keep this, ensure your News model's comment field is set up for it.
        await News.updateOne({ _id: newsId }, { $addToSet: { comments: newComment._id } });


        // Populate userId before sending response
        const populatedComment = await Comment.findById(newComment._id).populate('userId', 'name');

        return NextResponse.json(populatedComment, { status: 201 });

    } catch (err: any) {
        console.error(`Error adding comment to news ${newsId}:`, err);
        if (err.name === 'CastError') return NextResponse.json({ message: 'Invalid News ID format' }, { status: 400 });
        return NextResponse.json({ message: 'Error adding comment', error: err.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    await dbConnect();
    const newsId = params.id;

    try {
        const { error: idValidationError } = idSchema.validate(newsId);
        if (idValidationError) {
            return NextResponse.json({ message: 'Validation Error for News ID', errors: [idValidationError.details[0].message] }, { status: 400 });
        }

        const newsItem = await News.findById(newsId);
        if (!newsItem) {
            return NextResponse.json({ message: 'News item not found' }, { status: 404 });
        }

        const comments = await Comment.find({ newsId })
            .populate('userId', 'name') // Populate user name
            .sort({ createdAt: -1 });

        return NextResponse.json(comments);

    } catch (err: any) {
        console.error(`Error fetching comments for news ${newsId}:`, err);
        if (err.name === 'CastError') return NextResponse.json({ message: 'Invalid News ID format' }, { status: 400 });
        return NextResponse.json({ message: 'Error fetching comments', error: err.message }, { status: 500 });
    }
} 