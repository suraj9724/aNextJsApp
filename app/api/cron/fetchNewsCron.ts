// Ensure module resolution works with ts-node
// Run with: NODE_OPTIONS='-r tsconfig-paths/register' npx ts-node app/api/cron/fetchNewsCron.ts

import dbConnect from '@/lib/mongodb';
import RSSFeed from '@/models/rss.model';
import News from '@/models/news.model';
import User from '@/models/user.model';
import Parser from 'rss-parser';
import mongoose from 'mongoose';

// Extend the global interface to include our custom property
declare global {
    var newsFetchInterval: NodeJS.Timeout | undefined;
}

const parser = new Parser();

// Function to safely parse a date
function safeParseDate(dateString?: string): Date {
    if (!dateString) return new Date();

    const parsedDate = new Date(dateString);
    return !isNaN(parsedDate.getTime()) ? parsedDate : new Date();
}

async function fetchAndStoreNews() {
    try {
        await dbConnect();

        // Fetch all active RSS feeds
        const feeds = await RSSFeed.find({ isActive: true });

        // Find a default admin user to use for createdBy
        const defaultAdmin = await User.findOne({ role: 'admin' });
        if (!defaultAdmin) {
            throw new Error('No admin user found. Please create an admin user first.');
        }

        for (const feed of feeds) {
            try {
                const rss = await parser.parseURL(feed.rssLink);

                // Prepare news items for bulk upsert
                const newsItems = rss.items.map(item => ({
                    title: item.title || 'No title',
                    content: item.contentSnippet || item.content || '',
                    url: item.link || '',
                    publishedAt: safeParseDate(item.pubDate),
                    author: item.creator || item.author || '',
                    source: feed._id,
                    subtype: feed.subtype,
                    isActive: true,
                    likes: 0,
                    dislikes: 0,
                    likedBy: [],
                    dislikedBy: [],
                    comments: []
                })).filter(item => item.url); // Filter out items without URL

                if (newsItems.length > 0) {
                    const operations = newsItems.map(newsDoc => ({
                        updateOne: {
                            filter: { url: newsDoc.url }, // Assuming URL is unique for upsert
                            update: { $set: newsDoc },
                            upsert: true,
                        },
                    }));
                    await News.bulkWrite(operations);
                }

                // Update lastUpdated field of the feed
                // Add createdBy if missing (handles old data)
                if (!feed.createdBy) {
                    feed.createdBy = defaultAdmin._id as mongoose.Types.ObjectId;
                }
                feed.lastUpdated = new Date();
                await feed.save();

            } catch (feedErr) {
                console.error(`Error processing feed ${feed.rssLink}:`, feedErr);
            }
        }
    } catch (err) {
        console.error('Error in fetchAndStoreNews:', err);
    }
}

// Use a more robust scheduling approach
function scheduleNewsUpdate() {
    // Clear any existing interval to prevent multiple concurrent jobs
    if (global.newsFetchInterval) {
        clearInterval(global.newsFetchInterval);
    }

    // Run immediately
    fetchAndStoreNews();

    // Schedule to run every 1 minute
    global.newsFetchInterval = setInterval(() => {
        fetchAndStoreNews().catch(err => {
            console.error('Scheduled news fetch failed:', err);
        });
    }, 60 * 1000);
}

// Initialize the scheduling
scheduleNewsUpdate();

export default fetchAndStoreNews;
