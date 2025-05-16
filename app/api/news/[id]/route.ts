import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import News from '../../../../models/news.model.js';
import { idSchema } from '../../../../validations/rss.validation.js'; // Reusing idSchema for param validation
import { newsSchema } from '../../../../validations/news.validation.js'; // For PUT body validation
import RSSFeed from '../../../../models/rss.model';
// import { getUserIdAndRoleFromRequest } from '../../../../lib/authUtils'; // Placeholder for your auth logic

// Placeholder for req.user. This needs to be replaced with your actual auth logic in Next.js
const getUserIdAndRoleFromRequest = async (req: NextRequest): Promise<{ userId: string | null; userName: string | null; isAdminUser: boolean; error?: NextResponse }> => {
    console.warn('Auth bypass: Using placeholder user/admin for news/[id] routes');
    // For PUT/DELETE, admin is required. For GET, it might not be.
    const isWriteOperation = req.method === 'PUT' || req.method === 'DELETE';
    return {
        userId: 'PLACEHOLDER_USER_ID',
        userName: 'Placeholder User',
        isAdminUser: isWriteOperation ? true : false // Simulate admin for write ops for testing
    };
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    await dbConnect();

    try {
        const { error: idValidationError } = idSchema.validate(params.id);
        if (idValidationError) {
            return NextResponse.json({ message: 'Validation Error for ID', errors: [idValidationError.details[0].message] }, { status: 400 });
        }

        const newsItem = await News.findById(params.id)
            .populate('source', 'Provider subtype')
            .populate('likedBy', 'name')
            .populate('dislikedBy', 'name');

        if (!newsItem) {
            return NextResponse.json({ message: 'News item not found' }, { status: 404 });
        }
        return NextResponse.json(newsItem);

    } catch (err: any) {
        console.error(`Error fetching news item ${params.id}:`, err);
        if (err.name === 'CastError') return NextResponse.json({ message: 'Invalid news ID format' }, { status: 400 });
        return NextResponse.json({ message: 'Error fetching news item', error: err.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    await dbConnect();
    const authCheck = await getUserIdAndRoleFromRequest(req);

    if (!authCheck.userId || !authCheck.isAdminUser) {
        return authCheck.error || NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    try {
        const { error: idValidationError } = idSchema.validate(params.id);
        if (idValidationError) {
            return NextResponse.json({ message: 'Validation Error for ID', errors: [idValidationError.details[0].message] }, { status: 400 });
        }

        const body = await req.json();
        const { error: bodyValidationError } = newsSchema.validate(body); // Assuming full newsSchema for update
        if (bodyValidationError) {
            return NextResponse.json({ message: 'Validation Error for body', errors: bodyValidationError.details.map((d: any) => d.message) }, { status: 400 });
        }

        // Ensure source (RSSFeed ID) is not changed or is validated if it is part of body
        if (body.source) {
            const feed = await RSSFeed.findById(body.source);
            if (!feed) {
                return NextResponse.json({ message: 'RSS Feed not found for source' }, { status: 400 });
            }
        }

        const updatedNewsItem = await News.findByIdAndUpdate(
            params.id,
            {
                ...body,
                author: authCheck.userName, // Original logic: req.user.name for author on update
                // lastUpdated will be handled by timestamps: true in model
            },
            { new: true, runValidators: true }
        );

        if (!updatedNewsItem) {
            return NextResponse.json({ message: 'News item not found for update' }, { status: 404 });
        }
        return NextResponse.json(updatedNewsItem);

    } catch (err: any) {
        console.error(`Error updating news item ${params.id}:`, err);
        if (err.name === 'CastError') return NextResponse.json({ message: 'Invalid news ID format' }, { status: 400 });
        if (err.code === 11000) return NextResponse.json({ message: 'Duplicate key error (e.g. URL already exists)' }, { status: 400 });
        return NextResponse.json({ message: 'Error updating news item', error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    await dbConnect();
    const authCheck = await getUserIdAndRoleFromRequest(req);

    if (!authCheck.userId || !authCheck.isAdminUser) {
        return authCheck.error || NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    try {
        const { error: idValidationError } = idSchema.validate(params.id);
        if (idValidationError) {
            return NextResponse.json({ message: 'Validation Error for ID', errors: [idValidationError.details[0].message] }, { status: 400 });
        }

        const deletedNews = await News.findByIdAndDelete(params.id);
        if (!deletedNews) {
            return NextResponse.json({ message: 'News item not found for deletion' }, { status: 404 });
        }
        // Optionally: Delete associated comments here if desired
        // await Comment.deleteMany({ newsId: params.id });

        return NextResponse.json({ message: 'News item deleted successfully' });

    } catch (err: any) {
        console.error(`Error deleting news item ${params.id}:`, err);
        if (err.name === 'CastError') return NextResponse.json({ message: 'Invalid news ID format' }, { status: 400 });
        return NextResponse.json({ message: 'Error deleting news item', error: err.message }, { status: 500 });
    }
} 