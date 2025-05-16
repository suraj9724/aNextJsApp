import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import RSSFeed from '../../../../models/rss.model';

// Placeholder for authentication and authorization logic if needed
// Original Express route for active feeds did not specify auth, but you might want to add it.
const checkAuth = async (req: Request): Promise<{ authorized: boolean; error?: NextResponse }> => {
    console.warn('Auth bypass: Placeholder for auth check in /api/feeds/active');
    return { authorized: true };
};

export async function GET(req: Request) {
    await dbConnect();

    // const authResult = await checkAuth(req);
    // if (!authResult.authorized) return authResult.error!;

    try {
        // --- BEGIN IMPLEMENTED LOGIC for getActiveFeeds ---
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const query = { isActive: true };

        const activeFeeds = await RSSFeed.find(query)
            .sort({ Provider: 1 }) // Sort by Provider name ascending
            .skip(skip)
            .limit(limit)
            .select('-newsItems'); // Exclude potentially large newsItems array if embedded

        const totalActiveFeeds = await RSSFeed.countDocuments(query);
        // --- END IMPLEMENTED LOGIC ---

        return NextResponse.json({
            message: 'Active feeds retrieved successfully',
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalActiveFeeds / limit),
                totalItems: totalActiveFeeds,
                itemsPerPage: limit
            },
            data: activeFeeds
        });

    } catch (err: any) {
        console.error('Error in GET /api/feeds/active:', err);
        return NextResponse.json({ message: 'Error fetching active feeds', error: err.message }, { status: 500 });
    }
} 