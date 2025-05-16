"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../../lib/mongodb")); // Adjust path to your dbConnect
const rss_model_js_1 = __importDefault(require("../../../../models/rss.model")); // Adjust path
const news_model_js_1 = __importDefault(require("../../../../models/news.model")); // Adjust path
const rss_parser_1 = __importDefault(require("rss-parser"));
const rssParser = new rss_parser_1.default({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, text/xml; q=0.1'
    },
    timeout: 10000, // Increased timeout to 10 seconds
    maxRedirects: 5
});
// Helper function to clean HTML content (from original controller)
const cleanContent = (html) => {
    if (!html)
        return '';
    return html.replace(/<img[^>]*>/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};
// Helper function to extract feed URLs from HTML (adapted from original controller)
// TODO: Make this more robust, possibly with cheerio
function extractFeedUrls(html) {
    const feeds = [];
    // Updated regex pattern to match any TOI RSS feed URLs starting with /rss
    const regex = /<a\s+href=["'](https?:\/\/timesofindia\.indiatimes\.com\/rss[^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        feeds.push({
            rssLink: match[1],
            subtype: match[2].trim()
        });
    }
    console.log(`[ingest-toi] Extracted ${feeds.length} feed URLs`);
    return feeds;
}
async function GET(req) {
    // console.log("[ingest-toi] GET /api/admin/ingest-toi REQUEST RECEIVED");
    // const session = await getServerSession(authOptions);
    // if (!session || session.user?.role !== 'admin') {
    //     console.log("[ingest-toi] Admin access denied");
    //     return NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
    // }
    // const adminUserId = session.user?.id;
    await (0, mongodb_1.default)();
    try {
        const indexUrl = 'https://timesofindia.indiatimes.com/rss.cms';
        const indexResponse = await fetch(indexUrl);
        if (!indexResponse.ok) {
            return server_1.NextResponse.json({ message: `Failed to fetch TOI index: ${indexResponse.statusText}` }, { status: indexResponse.status });
        }
        const html = await indexResponse.text();
        const feedUrls = extractFeedUrls(html);
        if (feedUrls.length === 0) {
            console.warn("[ingest-toi] No feeds extracted - check HTML structure");
            return server_1.NextResponse.json({ message: 'No feed URLs extracted. The page structure might have changed.' }, { status: 400 });
        }
        const results = [];
        let totalNewsItems = 0;
        for (const feedInfo of feedUrls) { // Process first 5 feeds for testing
            try {
                const parsedFeed = await rssParser.parseURL(feedInfo.rssLink);
                // Upsert the RSS feed record
                const rssFeed = await rss_model_js_1.default.findOneAndUpdate({ rssLink: feedInfo.rssLink }, {
                    provider: 'Times of India', // Ensure 'provider' field is used as in schema
                    subtype: feedInfo.subtype,
                    rssLink: feedInfo.rssLink,
                    isActive: true,
                    lastUpdated: new Date()
                    // createdBy: adminUserId // Add if auth is re-enabled
                }, { upsert: true, new: true });
                if (!parsedFeed.items || parsedFeed.items.length === 0) {
                    results.push({
                        url: feedInfo.rssLink,
                        subtype: feedInfo.subtype, // Added subtype
                        status: 'success_no_items',
                        rssFeedId: rssFeed._id,
                        newsItemsCount: 0
                    });
                    continue;
                }
                // Process each feed item and store in News collection
                const newsItemsResults = await Promise.all(parsedFeed.items.map(async (item) => {
                    // Ensure all required fields for News model are present
                    const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
                    const title = item.title || 'No Title';
                    const url = item.link;
                    if (!url) {
                        console.warn(`[ingest-toi] Skipping item without URL in feed: ${feedInfo.rssLink}`, item);
                        return null; // Skip items without a URL
                    }
                    const newsData = {
                        title: title,
                        content: cleanContent(item.contentSnippet || item.content),
                        url: url,
                        publishedAt: publishedAt,
                        author: item.creator || item.author || 'Times of India', // Prefer item.creator, then item.author
                        source: rssFeed._id, // Link to the RSSFeed document
                        subtype: feedInfo.subtype || "general", // Inherit subtype from parent feed
                        provider: 'Times of India', // Explicitly set provider
                        // categories: item.categories || [] // Assuming categories can be an array of strings
                    };
                    // Upsert news item to prevent duplicates
                    try {
                        // Using the bulkUpsert static method from your News model, with type assertion
                        // For individual upsert, findOneAndUpdate is fine. If you intended bulk, that's different.
                        return await news_model_js_1.default.findOneAndUpdate({ url: newsData.url }, newsData, { upsert: true, new: true, runValidators: true });
                    }
                    catch (err) {
                        console.error(`[ingest-toi] News upsert failed for url: ${newsData.url}`, err);
                        // Not re-throwing, to allow other items in the same feed to be processed.
                        // The failure will be reflected in the overall results for this feed.
                        return null;
                    }
                }));
                const newsItems = newsItemsResults.filter(item => item !== null); // Remove null items (those skipped or failed)
                results.push({
                    url: feedInfo.rssLink,
                    subtype: feedInfo.subtype, // Added subtype
                    status: 'success',
                    rssFeedId: rssFeed._id,
                    newsItemsCount: newsItems.length
                });
                totalNewsItems += newsItems.length; // Moved this line inside the loop
            }
            catch (error) {
                console.error(`[ingest-toi] Feed processing failed: ${feedInfo.rssLink}`, error);
                results.push({
                    url: feedInfo.rssLink,
                    subtype: feedInfo.subtype, // Added subtype
                    status: 'failed',
                    error: error.message
                });
                // Optionally deactivate failed feed
                await rss_model_js_1.default.updateOne({ rssLink: feedInfo.rssLink }, { isActive: false, lastUpdated: new Date() });
            }
        }
        return server_1.NextResponse.json({
            message: 'TOI feed processing completed',
            totalFeedsProcessed: results.length,
            totalNewsItemsAdded: totalNewsItems,
            results
        });
    }
    catch (error) {
        console.error('[ingest-toi] Critical error:', error);
        return server_1.NextResponse.json({
            message: 'Internal server error',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
