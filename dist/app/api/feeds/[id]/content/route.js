"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../../../lib/mongodb"));
const rss_model_js_1 = __importDefault(require("../../../../../models/rss.model"));
const news_model_js_1 = __importDefault(require("../../../../../models/news.model.js"));
const rss_validation_js_1 = require("../../../../../validations/rss.validation.js");
// Placeholder for authentication and authorization logic
const checkAuth = async (req) => {
    // console.warn('Auth bypass: Placeholder for auth check in /api/feeds/[id]/content');
    // This route in original Express app had `auth` and `requireAdmin`.
    // Implement your full auth/admin check here.
    return { authorized: true };
};
async function GET(req, { params }) {
    await (0, mongodb_1.default)();
    // const authResult = await checkAuth(req);
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
        // --- BEGIN IMPLEMENTED LOGIC for getFeedContent ---
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;
        const newsItemsQuery = news_model_js_1.default.find({ source: rssFeed._id })
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit);
        const newsItems = await newsItemsQuery;
        const totalNewsItems = await news_model_js_1.default.countDocuments({ source: rssFeed._id });
        // --- END IMPLEMENTED LOGIC ---
        return server_1.NextResponse.json({
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
    }
    catch (err) {
        //  console.error('Error in GET /api/feeds/[id]/content:', err);
        if (err.name === 'CastError') {
            return server_1.NextResponse.json({ message: 'Invalid feed ID format' }, { status: 400 });
        }
        return server_1.NextResponse.json({ message: 'Error fetching feed content', error: err.message }, { status: 500 });
    }
}
