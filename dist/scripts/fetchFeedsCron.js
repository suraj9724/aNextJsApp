import cron from 'node-cron';
import Rss from '../models/rss.model';
import News from '../models/news.model.js';
import { fetchLatest } from '../app/utils/rssParser.js';
import { connectDB } from './utils/db.js';
// Initialize database connection
await connectDB();
// Prevent overlapping executions
let isRunning = false;
// Run every minute
cron.schedule('* * * * *', async () => {
    if (isRunning) {
        // console.log('Previous job still running, skipping...');
        return;
    }
    isRunning = true;
    try {
        // console.log('Running RSS feed refresh...');
        let allNewItems = [];
        // Get all active RSS feeds
        const feeds = await Rss.find({ isActive: true }).exec();
        if (!feeds.length) {
            console.log('No active RSS feeds found');
            return;
        }
        // Process each feed sequentially
        for (const feed of feeds) {
            try {
                // console.log(`Processing feed: ${feed.Provider} (${feed.rssLink})`);
                const newItems = await fetchLatest(feed.rssLink);
                if (newItems && newItems.length > 0) {
                    // Process and clone items with all required metadata
                    const processedItems = newItems.map(item => ({
                        ...item,
                        source: feed._id,
                        provider: feed.title,
                        subtype: feed.subtype,
                        uniqueKey: `${feed._id}-${item.url || item.title}`,
                        publishedAt: item.publishedAt && !isNaN(new Date(item.publishedAt).getTime())
                            ? new Date(item.publishedAt)
                            : new Date()
                    }));
                    allNewItems = allNewItems.concat(processedItems);
                    // console.log(`Found ${newItems.length} new items from ${feed.subtype}`);
                }
                else {
                    console.log(`No new items found for ${feed.title || feed.Provider}`);
                }
            }
            catch (error) {
                console.error(`Failed to process feed ${feed.title || feed.Provider}:`, {
                    message: error.message,
                    feed: feed.rssLink,
                    time: new Date().toISOString()
                });
            }
        }
        // Bulk upsert all new items
        if (allNewItems.length > 0) {
            await News.insertMany(allNewItems);
            // console.log(`Added/updated ${allNewItems.length} news items from ${feeds.length} feeds`);
        }
        else {
            console.log('No new items found across all feeds');
        }
    }
    catch (error) {
        console.error('Feed refresh failed:', {
            message: error.message,
            stack: error.stack,
            time: new Date().toISOString()
        });
    }
    finally {
        isRunning = false;
    }
}, {
    timezone: 'UTC'
});
export default cron;
