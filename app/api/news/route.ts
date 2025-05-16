import { NextResponse, NextRequest } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../lib/mongodb';
import News, { INews } from '../../../models/news.model';
import RSSFeed from '../../../models/rss.model';
import Comment from '../../../models/comment.model';
import { newsSchema } from '../../../validations/news.validation';
// import { getUserFromRequest, isAdmin } from '../../../lib/authUtils'; // Placeholder for your auth logic

// Placeholder for req.user. This needs to be replaced with your actual auth logic in Next.js
const getUserIdAndRoleFromRequest = async (req: NextRequest): Promise<{ userId: string | null; userName: string | null; isAdminUser: boolean; error?: NextResponse }> => {
    // Example: If using NextAuth.js, you might get the session here
    // const session = await getServerSession(authOptions); // (authOptions would need to be defined)
    // if (!session?.user?.id) return { userId: null, userName: null, isAdminUser: false, error: NextResponse.json({ message: 'Authentication required' }, { status: 401 }) };
    // const isAdminUser = session.user.role === 'admin';
    // return { userId: session.user.id, userName: session.user.name, isAdminUser };
    console.warn('Auth bypass: Using placeholder user/admin for news routes');
    // For POST (createNews), admin is required. For GET, it's not.
    // This placeholder will allow GET but you'll need real admin check for POST.
    const isPost = req.method === 'POST';
    return { userId: 'PLACEHOLDER_USER_ID', userName: 'Placeholder User', isAdminUser: isPost ? true : false }; // Simulate admin for POST for testing
};

export async function POST(req: NextRequest) {
    await dbConnect();
    const authCheck = await getUserIdAndRoleFromRequest(req);

    if (!authCheck.userId) return authCheck.error!;
    if (!authCheck.isAdminUser) {
        return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { error } = newsSchema.validate(body);
        if (error) {
            return NextResponse.json({
                message: 'Validation Error',
                errors: error.details.map((d: any) => d.message)
            }, { status: 400 });
        }

        const feed = await RSSFeed.findById(body.source);
        if (!feed) {
            return NextResponse.json({ message: 'RSS Feed not found for source' }, { status: 400 });
        }

        const newsItem = new News({
            ...body,
            author: body.author || authCheck.userName, // Original logic: req.body.author || req.user.name
        });

        await newsItem.save();
        return NextResponse.json(newsItem, { status: 201 });

    } catch (err: any) {
        console.error('Error creating news item:', err);
        return NextResponse.json({ message: 'Error creating news item', error: err.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    await dbConnect();

    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const subtype = searchParams.get('subtype');
        const searchTerm = searchParams.get('search');

        const query: any = {};
        if (subtype) query.subtype = { $regex: new RegExp(`^${subtype}$`, 'i') };
        if (searchTerm) query.$text = { $search: searchTerm };

        const totalCount = await News.countDocuments(query);
        const newsList = await News.find(query)
            .sort({ publishedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('source', 'Provider subtype') // Adjusted from 'title provider' to fit RSSFeed model better
            .populate('likedBy', 'name')
            .populate('dislikedBy', 'name');

        const commentCounts = await Comment.aggregate([
            { $match: { newsId: { $in: newsList.map(n => n._id) } } },
            { $group: { _id: "$newsId", count: { $sum: 1 } } }
        ]);

        const commentCountMap: { [key: string]: number } = {};
        commentCounts.forEach(c => {
            commentCountMap[c._id.toString()] = c.count;
        });

        const newsWithCommentsCount = newsList.map(item => {
            const obj = item.toObject() as typeof item & { commentsCount: number };
            obj.commentsCount = commentCountMap[(item as any)._id.toString()] || 0;
            return obj;
        });

        const totalPages = Math.ceil(totalCount / limit);

        return NextResponse.json({ news: newsWithCommentsCount, totalCount, totalPages });

    } catch (err: any) {
        console.error('Error fetching all news:', err);
        return NextResponse.json({ message: 'Error fetching all news', error: err.message }, { status: 500 });
    }
} 