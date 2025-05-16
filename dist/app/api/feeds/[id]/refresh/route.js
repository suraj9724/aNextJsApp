"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../../../lib/mongodb"));
const rss_model_js_1 = __importDefault(require("../../../../../models/rss.model"));
const news_model_js_1 = __importDefault(require("../../../../../models/news.model.js"));
const rss_validation_js_1 = require("../../../../../validations/rss.validation.js");
const rss_parser_1 = __importDefault(require("rss-parser"));
// Placeholder for authentication and authorization logic
const checkAuthAndAdmin = async (req) => {
    console.warn('Auth bypass: Placeholder for auth and admin check in /api/feeds/[id]/refresh');
    return { authorized: true }; // Simulate authorized admin
};
const parserInstance = new rss_parser_1.default({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, text/xml; q=0.1'
    },
    timeout: 10000,
    maxRedirects: 5
});
// Helper function to clean HTML content (copied from your controller structure)
const cleanContent = (html) => {
    if (!html)
        return '';
    return html.replace(/<img[^>]*>/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};
async function POST(req, { params }) {
    await (0, mongodb_1.default)();
    // const authResult = await checkAuthAndAdmin(req);
    // if (!authResult.authorized) return authResult.error!;
    try {
        const { error: idValidationError } = rss_validation_js_1.idSchema.validate(params.id);
        if (idValidationError) {
            return server_1.NextResponse.json({
                message: 'Validation Error for ID',
                errors: [idValidationError.details[0].message]
            }, { status: 400 });
        }
        const rssFeed = await rss_model_js_1.default.findById(params.id);
        if (!rssFeed) {
            return server_1.NextResponse.json({ message: 'RSS feed not found' }, { status: 404 });
        }
        if (!rssFeed.isActive) {
            return server_1.NextResponse.json({ message: 'Cannot refresh an inactive feed' }, { status: 400 });
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
                return server_1.NextResponse.json({ message: 'Feed parsed, but no items found or feed structure issue.', feedInfo: rssFeed });
            }
            for (const item of feed.items) {
                if (!item.link) {
                    console.warn('Skipping item without link:', item.title);
                    continue;
                }
                const newsData = {
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
                const result = await news_model_js_1.default.findOneAndUpdate({ url: newsData.url }, // Query to find existing news item by URL
                    { $setOnInsert: newsData }, // Apply newsData only on insert
                    { upsert: true, new: true, setDefaultsOnInsert: true });
                itemsProcessed++;
                if (result.createdAt.getTime() === result.updatedAt.getTime()) { // Heuristic: if createdAt and updatedAt are same, it's likely a new doc
                    itemsCreated++;
                }
                else {
                    itemsUpdated++;
                }
            }
            rssFeed.lastUpdated = new Date();
            await rssFeed.save();
            console.log(`Feed refreshed: ${rssFeed.rssLink}. Items processed: ${itemsProcessed}, Created: ${itemsCreated}, Updated: ${itemsUpdated}`);
            return server_1.NextResponse.json({
                message: `Feed refreshed successfully. Items processed: ${itemsProcessed} (New: ${itemsCreated}, Existing updated: ${itemsUpdated}).`,
                feedInfo: {
                    _id: rssFeed._id,
                    rssLink: rssFeed.rssLink,
                    lastUpdated: rssFeed.lastUpdated,
                    Provider: rssFeed.Provider
                }
            });
        }
        catch (parseOrDbError) {
            console.error(`Error parsing feed or saving news items for ${rssFeed.rssLink}:`, parseOrDbError);
            // Optionally, update lastUpdated with an error flag or don't update it
            // rssFeed.lastAttemptFailed = true; 
            // await rssFeed.save();
            return server_1.NextResponse.json({ message: 'Error during feed parsing or database operation', error: parseOrDbError.message }, { status: 500 });
        }
        // --- END IMPLEMENTED LOGIC ---
    }
    catch (err) {
        console.error('Error in POST /api/feeds/[id]/refresh:', err);
        if (err.name === 'CastError') {
            return server_1.NextResponse.json({ message: 'Invalid feed ID format' }, { status: 400 });
        }
        return server_1.NextResponse.json({ message: 'Error refreshing feed content', error: err.message }, { status: 500 });
    }
}
