import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import RSSFeed from '../../../../../models/rss.model';
import News from '../../../../../models/news.model.js';
import { idSchema } from '../../../../../validations/rss.validation.js';
import Parser from 'rss-parser';

// Placeholder for authentication and authorization logic
const checkAuthAndAdmin = async (req: Request): Promise<{ authorized: boolean; error?: NextResponse }> => {
    console.warn('Auth bypass: Placeholder for auth and admin check in /api/feeds/[id]/refresh');
    return { authorized: true }; // Simulate authorized admin
};

const parserInstance = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, text/xml; q=0.1'
    },
    timeout: 20000,
    maxRedirects: 5
});

// Helper function to clean HTML content (copied from your controller structure)
const cleanContent = (html: string | undefined | null): string => {
    if (!html) return '';
    return html.replace(/<img[^>]*>/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
    await dbConnect();

    // const authResult = await checkAuthAndAdmin(req);
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
        if (!rssFeed.isActive) {
            return NextResponse.json({ message: 'Cannot refresh an inactive feed' }, { status: 400 });
        }

        // --- BEGIN IMPLEMENTED LOGIC for refreshFeedContent ---
        console.log(`Attempting to refresh feed: ${rssFeed.rssLink} for ID: ${params.id}`);
        try {
            const feed = await parserInstance.parseURL(rssFeed.rssLink);
            let itemsProcessed = 0;
            let itemsCreated = 0;
            let itemsUpdated = 0;

            if (!feed || !feed.items) {
                console.warn(`No items found in feed: ${rssFeed.rssLink}`);
                // Optionally, update lastUpdated even if no items, to indicate an attempt was made
                // rssFeed.lastUpdated = new Date(); 
                // await rssFeed.save();
                return NextResponse.json({ message: 'Feed parsed, but no items found or feed structure issue.', feedInfo: rssFeed });
            }

            for (const item of feed.items) {
                if (!item.link) {
                    console.warn('Skipping item without link:', item.title);
                    continue;
                }

                const newsData: any = {
                    Provider: rssFeed.Provider,
                    title: item.title || 'No title',
                    description: item.contentSnippet || cleanContent(item.content) || item.title || 'No description',
                    content: cleanContent(item.content) || item.contentSnippet || item.title || 'No content',
                    url: item.link,
                    publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                    author: item.creator || item.author || rssFeed.Provider, // Prioritize item.author if available
                    source: rssFeed._id,
                    subtype: rssFeed.subtype,
                    categories: item.categories || [],
                    // Add other fields from item if available and mapped in your News model
                    // e.g., item.isoDate, item.guid, etc.
                };
                // Ensure required fields like title, url are present
                if (!newsData.title || !newsData.url) {
                    console.warn('Skipping item due to missing title or URL:', item);
                    continue;
                }


                const result = await News.findOneAndUpdate(
                    { url: newsData.url }, // Query to find existing news item by URL
                    { $setOnInsert: newsData }, // Apply newsData only on insert
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                itemsProcessed++;
                if (result.createdAt.getTime() === result.updatedAt.getTime()) { // Heuristic: if createdAt and updatedAt are same, it's likely a new doc
                    itemsCreated++;
                } else {
                    itemsUpdated++;
                }
            }
            rssFeed.lastUpdated = new Date();
            await rssFeed.save();
            console.log(`Feed refreshed: ${rssFeed.rssLink}. Items processed: ${itemsProcessed}, Created: ${itemsCreated}, Updated: ${itemsUpdated}`);
            return NextResponse.json({
                message: `Feed refreshed successfully. Items processed: ${itemsProcessed} (New: ${itemsCreated}, Existing updated: ${itemsUpdated}).`,
                feedInfo: {
                    _id: rssFeed._id,
                    rssLink: rssFeed.rssLink,
                    lastUpdated: rssFeed.lastUpdated,
                    Provider: rssFeed.Provider
                }
            });
        } catch (parseOrDbError: any) {
            console.error(`Error parsing feed or saving news items for ${rssFeed.rssLink}:`, parseOrDbError);
            // Optionally, update lastUpdated with an error flag or don't update it
            // rssFeed.lastAttemptFailed = true; 
            // await rssFeed.save();
            return NextResponse.json({ message: 'Error during feed parsing or database operation', error: parseOrDbError.message }, { status: 500 });
        }
        // --- END IMPLEMENTED LOGIC ---

    } catch (err: any) {
        console.error('Error in POST /api/feeds/[id]/refresh:', err);
        if (err.name === 'CastError') {
            return NextResponse.json({ message: 'Invalid feed ID format' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Error refreshing feed content', error: err.message }, { status: 500 });
    }
} 