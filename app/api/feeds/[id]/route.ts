import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb'; // Adjusted path
import RSSFeed from '../../../../models/rss.model'; // Adjusted path
import {
    idSchema,
    updateRssFeedSchema
} from '../../../../validations/rss.validation'; // Adjusted path
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/auth.config';

// Placeholder for authentication and authorization logic
// In your Express app, these routes were protected by `auth` and `requireAdmin` middleware.
// You'll need to implement similar checks here based on your Next.js auth solution.
const checkAuthAndAdmin = async (req: Request): Promise<{ authorized: boolean; userId?: string; error?: NextResponse }> => {
    const session = await getServerSession(authOptions);
    if (!session) {
        return { authorized: false, error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
    }
    return { authorized: true };
};

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Treat params as a Promise
) {
    await dbConnect();

    const authResult = await checkAuthAndAdmin(req);
    if (!authResult.authorized) return authResult.error!;

    try {
        const { error: idValidationError } = idSchema.validate((await params).id);
        if (idValidationError) {
            return NextResponse.json({
                message: 'Validation Error',
                errors: [idValidationError.details[0].message]
            }, { status: 400 });
        }

        const feed = await RSSFeed.findById((await params).id);
        if (!feed) {
            return NextResponse.json({ message: 'RSS feed not found' }, { status: 404 });
        }
        // Original controller also checked if (!feed.isActive) but for GET, it might be okay to show it.
        // If you want to enforce only active feeds here, uncomment the below:
        // if (!feed.isActive) {
        //   return NextResponse.json({ message: 'This feed is currently inactive' }, { status: 400 });
        // }

        return NextResponse.json({ feedInfo: feed });

    } catch (err: any) {
        console.error('Error in GET /api/feeds/[id]:', err);
        if (err.name === 'CastError') { // Mongoose CastError for invalid ObjectId format
            return NextResponse.json({ message: 'Invalid feed ID format' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Failed to fetch feed information', error: err.message }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Treat params as a Promise
) {
    await dbConnect();

    // const authResult = await checkAuthAndAdmin(req);
    // if (!authResult.authorized) return authResult.error!;

    try {
        const { error: idValidationError } = idSchema.validate((await params).id);
        if (idValidationError) {
            return NextResponse.json({
                message: 'Validation Error for ID',
                errors: [idValidationError.details[0].message]
            }, { status: 400 });
        }

        const body = await req.json();
        const { error: bodyValidationError } = updateRssFeedSchema.validate(body);
        if (bodyValidationError) {
            return NextResponse.json({
                message: 'Validation Error for body',
                errors: bodyValidationError.details.map((d: any) => d.message)
            }, { status: 400 });
        }

        const { Provider, subtype, rssLink, isActive } = body;

        const updatedFeed = await RSSFeed.findByIdAndUpdate(
            (await params).id,
            { Provider, subtype, rssLink, isActive, lastUpdated: new Date() }, // Ensure lastUpdated is set
            { new: true, runValidators: true }
        );

        if (!updatedFeed) {
            return NextResponse.json({ message: 'RSS feed not found' }, { status: 404 });
        }

        return NextResponse.json(updatedFeed);

    } catch (err: any) {
        console.error('Error in PUT /api/feeds/[id]:', err);
        if (err.name === 'CastError') {
            return NextResponse.json({ message: 'Invalid feed ID format' }, { status: 400 });
        }
        if (err.name === 'ValidationError') {
            const errors: { [key: string]: string } = {};
            Object.keys(err.errors).forEach(key => {
                errors[key] = err.errors[key].message;
            });
            return NextResponse.json({ message: 'Validation failed', errors }, { status: 400 });
        }
        if (err.code === 11000) { // Duplicate key error (e.g. rssLink)
            return NextResponse.json({ message: 'RSS feed with this URL already exists' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Error updating RSS feed', error: err.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Treat params as a Promise
) {
    await dbConnect();

    // const authResult = await checkAuthAndAdmin(req);
    // if (!authResult.authorized) return authResult.error!;

    try {
        const { error: idValidationError } = idSchema.validate((await params).id);
        if (idValidationError) {
            return NextResponse.json({
                message: 'Validation Error for ID',
                errors: [idValidationError.details[0].message]
            }, { status: 400 });
        }

        const deletedFeed = await RSSFeed.findByIdAndDelete((await params).id);

        if (!deletedFeed) {
            return NextResponse.json({ message: 'RSS feed not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'RSS feed deleted successfully' });

    } catch (err: any) {
        console.error('Error in DELETE /api/feeds/[id]:', err);
        if (err.name === 'CastError') {
            return NextResponse.json({ message: 'Invalid feed ID format' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Error deleting RSS feed', error: err.message }, { status: 500 });
    }
} 