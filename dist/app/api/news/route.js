"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../lib/mongodb"));
const news_model_js_1 = __importDefault(require("../../../models/news.model"));
const rss_model_js_1 = __importDefault(require("../../../models/rss.model"));
const comment_model_js_1 = __importDefault(require("../../../models/comment.model"));
const news_validation_js_1 = require("../../../validations/news.validation.js");
// import { getUserFromRequest, isAdmin } from '../../../lib/authUtils'; // Placeholder for your auth logic
// Placeholder for req.user. This needs to be replaced with your actual auth logic in Next.js
const getUserIdAndRoleFromRequest = async (req) => {
    // Example: If using NextAuth.js, you might get the session here
    // const session = await getServerSession(authOptions); // (authOptions would need to be defined)
    // if (!session?.user?.id) return { userId: null, userName: null, isAdminUser: false, error: NextResponse.json({ message: 'Authentication required' }, { status: 401 }) };
    // const isAdminUser = session.user.role === 'admin';
    // return { userId: session.user.id, userName: session.user.name, isAdminUser };
    console.warn('Auth bypass: Using placeholder user/admin for news routes');
    // For POST (createNews), admin is required. For GET, it's not.
    // This placeholder will allow GET but you'll need real admin check for POST.
    const isPost = req.method === 'POST';
    return { userId: 'PLACEHOLDER_USER_ID', userName: 'Placeholder User', isAdminUser: isPost ? true : false }; // Simulate admin for POST for testing
};
async function POST(req) {
    await (0, mongodb_1.default)();
    const authCheck = await getUserIdAndRoleFromRequest(req);
    if (!authCheck.userId)
        return authCheck.error;
    if (!authCheck.isAdminUser) {
        return server_1.NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }
    try {
        const body = await req.json();
        const { error } = news_validation_js_1.newsSchema.validate(body);
        if (error) {
            return server_1.NextResponse.json({
                message: 'Validation Error',
                errors: error.details.map((d) => d.message)
            }, { status: 400 });
        }
        const feed = await rss_model_js_1.default.findById(body.source);
        if (!feed) {
            return server_1.NextResponse.json({ message: 'RSS Feed not found for source' }, { status: 400 });
        }
        const newsItem = new news_model_js_1.default({
            ...body,
            author: body.author || authCheck.userName, // Original logic: req.body.author || req.user.name
        });
        await newsItem.save();
        return server_1.NextResponse.json(newsItem, { status: 201 });
    }
    catch (err) {
        console.error('Error creating news item:', err);
        return server_1.NextResponse.json({ message: 'Error creating news item', error: err.message }, { status: 500 });
    }
}
async function GET(req) {
    await (0, mongodb_1.default)();
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const subtype = searchParams.get('subtype');
        const searchTerm = searchParams.get('search');
        const query = {};
        if (subtype)
            query.subtype = { $regex: new RegExp(`^${subtype}$`, 'i') };
        if (searchTerm)
            query.$text = { $search: searchTerm };
        const totalCount = await news_model_js_1.default.countDocuments(query);
        const newsList = await news_model_js_1.default.find(query)
            .sort({ publishedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('source', 'Provider subtype') // Adjusted from 'title provider' to fit RSSFeed model better
            .populate('likedBy', 'name')
            .populate('dislikedBy', 'name');
        const commentCounts = await comment_model_js_1.default.aggregate([
            { $match: { newsId: { $in: newsList.map(n => n._id) } } },
            { $group: { _id: "$newsId", count: { $sum: 1 } } }
        ]);
        const commentCountMap = {};
        commentCounts.forEach(c => {
            commentCountMap[c._id.toString()] = c.count;
        });
        const newsWithCommentsCount = newsList.map(item => {
            const obj = item.toObject();
            obj.commentsCount = commentCountMap[item._id.toString()] || 0;
            return obj;
        });
        const totalPages = Math.ceil(totalCount / limit);
        return server_1.NextResponse.json({ news: newsWithCommentsCount, totalCount, totalPages });
    }
    catch (err) {
        console.error('Error fetching all news:', err);
        return server_1.NextResponse.json({ message: 'Error fetching all news', error: err.message }, { status: 500 });
    }
}
