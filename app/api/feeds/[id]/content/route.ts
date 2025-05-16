import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import RSSFeed from '../../../../../models/rss.model';
import News from '../../../../../models/news.model';
import { idSchema } from '../../../../../validations/rss.validation';

// Placeholder for authentication and authorization logic
const checkAuth = async (req: Request): Promise<{ authorized: boolean; error?: NextResponse }> => {
    // console.warn('Auth bypass: Placeholder for auth check in /api/feeds/[id]/content');
    // This route in original Express app had `auth` and `requireAdmin`.
    // Implement your full auth/admin check here.
    return { authorized: true };
};

export async function GET(req: Request, { params }: { params: { id: string } }) {
    await dbConnect();

    // const authResult = await checkAuth(req);
    // if (!authResult.authorized) return authResult.error!;

    try {
        const { error: idValidationError } = idSchema.validate(params.id);
        if (idValidationError) {
            return NextResponse.json({
                message: 'Validation Error for ID',
                errors: [idValidationError.details[0].message]
            }, { status: 400 });
        }

        const rssFeed = await RSSFeed.findById(params.id);
        if (!rssFeed) {
            return NextResponse.json({ message: 'RSS feed not found' }, { status: 404 });
        }

        // --- BEGIN IMPLEMENTED LOGIC for getFeedContent ---
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const newsItemsQuery = News.find({ source: rssFeed._id })
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit);

        const newsItems = await newsItemsQuery;
        const totalNewsItems = await News.countDocuments({ source: rssFeed._id });

        // --- END IMPLEMENTED LOGIC ---

        return NextResponse.json({
            message: 'Feed content retrieved successfully',
            feedInfo: {
                _id: rssFeed._id,
                Provider: rssFeed.Provider,
                rssLink: rssFeed.rssLink,
                subtype: rssFeed.subtype,
                isActive: rssFeed.isActive,
                lastUpdated: rssFeed.lastUpdated
            },
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalNewsItems / limit),
                totalItems: totalNewsItems,
                itemsPerPage: limit
            },
            content: newsItems
        });

    } catch (err: any) {
        //  console.error('Error in GET /api/feeds/[id]/content:', err);
        if (err.name === 'CastError') {
            return NextResponse.json({ message: 'Invalid feed ID format' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Error fetching feed content', error: err.message }, { status: 500 });
    }
}