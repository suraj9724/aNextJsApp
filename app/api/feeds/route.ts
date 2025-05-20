import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../lib/mongodb'; // Adjusted path
import RSSFeed from '../../../models/rss.model'; // Adjusted path, .js extension
import News from '../../../models/news.model'; // Add News model import
import { createRssFeedSchema } from '../../../validations/rss.validation'; // Adjusted path, .js extension
import { getServerSession } from "next-auth/next"; // Import for session
import { authOptions } from "../auth/auth.config"; // Import your authOptions
import Parser from 'rss-parser'; // Import RSS parser

// Initialize RSS parser with configuration
const rssParser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, text/xml; q=0.1'
    },
    timeout: 20000,
    maxRedirects: 5
});

// Helper function to clean HTML content
const cleanContent = (html: string | undefined | null): string => {
    if (!html) return '';

    // First remove all script and style tags and their contents
    let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove image tags with their attributes
    cleaned = cleaned.replace(/<img[^>]+>/g, '');

    // Remove all HTML tags but preserve line breaks
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<[^>]+>/g, '');

    // Remove any leftover HTML entities
    cleaned = cleaned.replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, "/")
        .replace(/&#32;/g, " ")
        .replace(/&hellip;/g, "...")
        .replace(/\xa0/g, ' ');

    // Fix spacing issues
    cleaned = cleaned.replace(/\s+/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();

    // Remove any URLs that might be left in the text
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');

    // Remove any remaining HTML-like content
    cleaned = cleaned.replace(/<[^>]*>/g, '');

    return cleaned;
};

// Helper function to parse date
const parseDate = (dateStr: string): Date => {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return new Date();
        }
        return date;
    } catch (error) {
        return new Date();
    }
};

// Define interface for feed items
interface FeedItem {
    title?: string;
    link?: string;
    pubDate?: string;
    content?: string;
    contentSnippet?: string;
    'content:encoded'?: string;
    creator?: string;
    author?: string;
}

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
            createdBy: adminId,
        });

        await newFeed.save();

        // Immediately fetch and store news from the new feed
        const fetchResult = await fetchAndStoreNews(newFeed);

        return NextResponse.json({
            feed: newFeed,
            newsFetchResult: fetchResult
        }, { status: 201 });

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

// Helper function to fetch and store news from a feed
async function fetchAndStoreNews(feed: any) {
    try {
        const parsedFeed = await rssParser.parseURL(feed.rssLink);
        if (!parsedFeed.items || parsedFeed.items.length === 0) {
            return { status: 'success_no_items', count: 0 };
        }

        // Process each feed item and store in News collection
        const newsItemsResults = await Promise.all(parsedFeed.items.map(async (item: FeedItem) => {
            // Ensure all required fields for News model are present
            const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
            const title = item.title || 'No Title';
            const url = item.link;

            if (!url) {
                console.warn(`Skipping item without URL in feed: ${feed.rssLink}`, item);
                return null; // Skip items without a URL
            }

            const newsData = {
                title: title,
                content: cleanContent(item.content || item['content:encoded'] || item.contentSnippet || ''),
                contentSnippet: cleanContent(item.contentSnippet || item.content || '').slice(0, 200),
                url: url,
                publishedAt: parseDate(item.pubDate || new Date().toISOString()),
                author: item.creator || item.author || feed.Provider,
                source: feed._id,
                subtype: feed.subtype || "general",
                provider: feed.Provider,
            };

            // Ensure content is properly cleaned before saving
            if (!newsData.content || newsData.content.includes('<a href=')) {
                newsData.content = cleanContent(newsData.content);
            }

            try {
                return await News.findOneAndUpdate(
                    { url: newsData.url },
                    newsData,
                    { upsert: true, new: true, runValidators: true }
                );
            } catch (err) {
                console.error(`News upsert failed for url: ${newsData.url}`, err);
                return null;
            }
        }));

        const validNewsItems = newsItemsResults.filter(item => item !== null);

        // Update the feed's lastUpdated timestamp
        await RSSFeed.updateOne(
            { _id: feed._id },
            { lastUpdated: new Date() }
        );

        return {
            status: 'success',
            count: validNewsItems.length,
            message: `Successfully fetched and stored ${validNewsItems.length} news items`
        };
    } catch (error: any) {
        console.error(`Error fetching news from feed ${feed.rssLink}:`, error);

        // Update feed status to inactive if there's an error
        await RSSFeed.updateOne(
            { _id: feed._id },
            {
                isActive: false,
                lastUpdated: new Date()
            }
        );

        return {
            status: 'error',
            error: error.message,
            message: `Failed to fetch news from feed: ${error.message}`
        };
    }
} 