import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../lib/mongodb'; // Adjusted path
import RSSFeed from '../../../models/rss.model'; // Adjusted path, .js extension
import { createRssFeedSchema } from '../../../validations/rss.validation'; // Adjusted path, .js extension
import { getServerSession } from "next-auth/next"; // Import for session
import { authOptions } from "../auth/[...nextauth]/route"; // Import your authOptions
// import Parser from 'rss-parser'; // We'll use this later for feed parsing logic

// Placeholder for req.user. This needs to be replaced with your actual auth logic in Next.js
// const getUserIdFromRequest = async (req: Request): Promise<string | null> => {
//     // Example: If using NextAuth.js, you might get the session here
//     // const session = await getServerSession(authOptions); // (authOptions would need to be defined)
//     // return session?.user?.id || null;
//     console.warn('Auth bypass: Using placeholder admin ID for testing createFeed');
//     return 'PLACEHOLDER_ADMIN_ID'; // Replace with actual admin user ID from your DB for testing if needed
// };

export async function POST(req: NextRequest) {
    await dbConnect();

    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized: Please log in.' }, { status: 401 });
    }

    // @ts-ignore // NextAuth types can be tricky with custom session properties
    if (session.user?.role !== 'admin') {
        return NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { error } = createRssFeedSchema.validate(body);
        if (error) {
            return NextResponse.json({
                message: 'Validation Error',
                errors: error.details.map((d: any) => d.message)
            }, { status: 400 });
        }

        let { Provider, provider, subtype, rssLink } = body;
        Provider = Provider || provider; // Handle alias

        // @ts-ignore
        const adminId = session.user?.id; // Use the actual admin ID from the session
        // IMPORTANT: You will need to ensure this adminId corresponds to an actual Admin user in your DB
        // or temporarily remove the 'createdBy' requirement from the RssFeed model if it causes issues during initial setup.

        const existingFeed = await RSSFeed.findOne({ rssLink });
        if (existingFeed) {
            return NextResponse.json({ message: 'RSS feed already exists' }, { status: 400 });
        }

        const newFeed = new RSSFeed({
            Provider: Provider,
            subtype: subtype,
            rssLink: rssLink,
            createdBy: adminId, // This needs a valid Admin ObjectId
            // datetimestamp and lastUpdated will default from schema
        });

        await newFeed.save();
        return NextResponse.json(newFeed, { status: 201 });

    } catch (err: any) {
        console.error('Error creating RSS feed:', err);
        if (err.name === 'ValidationError') {
            const errors: { [key: string]: string } = {};
            Object.keys(err.errors).forEach(key => {
                errors[key] = err.errors[key].message;
            });
            return NextResponse.json({
                message: 'Validation failed',
                errors
            }, { status: 400 });
        }
        if (err.code === 11000) {
            return NextResponse.json({
                message: 'RSS feed with this URL already exists'
            }, { status: 400 });
        }
        return NextResponse.json({
            message: 'Error creating RSS feed',
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    await dbConnect();

    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized: Please log in.' }, { status: 401 });
    }

    // If you wanted only admins to list feeds, you would add role check here:
    // // @ts-ignore 
    // if (session.user?.role !== 'admin') {
    //     return NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
    // }

    try {
        const feeds = await RSSFeed.find().sort({ datetimestamp: -1 });
        return NextResponse.json(feeds);
    } catch (err: any) {
        console.error('Error fetching all RSS feeds:', err);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
} 