"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../../../lib/mongodb"));
const news_model_js_1 = __importDefault(require("../../../../../models/news.model"));
const comment_model_js_1 = __importDefault(require("../../../../../models/comment.model"));
const rss_validation_js_1 = require("../../../../../validations/rss.validation.js"); // For newsId param validation
const next_auth_1 = require("next-auth");
const route_1 = require("../../../auth/[...nextauth]/route");
// Placeholder for req.user. This needs to be replaced with your actual auth logic in Next.js
const getUserIdFromRequest = async (req) => {
    const session = await (0, next_auth_1.getServerSession)(route_1.authOptions);
    if (!session) {
        return { userId: null, error: server_1.NextResponse.json({ message: 'Authentication required' }, { status: 401 }) };
    }
    return { userId: session.user.id };
};
async function POST(req, { params }) {
    await (0, mongodb_1.default)();
    const authCheck = await getUserIdFromRequest(req);
    if (!authCheck.userId) {
        return authCheck.error || server_1.NextResponse.json({ message: 'Authentication required to comment' }, { status: 401 });
    }
    const userId = authCheck.userId;
    const newsId = params.id;
    try {
        const { error: idValidationError } = rss_validation_js_1.idSchema.validate(newsId);
        if (idValidationError) {
            return server_1.NextResponse.json({ message: 'Validation Error for News ID', errors: [idValidationError.details[0].message] }, { status: 400 });
        }
        const body = await req.json();
        const { comment: commentText } = body;
        if (!commentText || String(commentText).trim() === '') {
            return server_1.NextResponse.json({ message: 'Comment text is required' }, { status: 400 });
        }
        const newsItem = await news_model_js_1.default.findById(newsId);
        if (!newsItem) {
            return server_1.NextResponse.json({ message: 'News item not found' }, { status: 404 });
        }
        const newComment = new comment_model_js_1.default({
            newsId,
            comment: String(commentText).trim(),
            userId,
        });
        await newComment.save();
        // Add comment reference to news (original controller does this)
        // newsItem.comments.push(newComment._id); // Make sure 'comments' field in News model is an array of ObjectId
        // await newsItem.save(); // This might be redundant if you only query Comments by newsId
        // For simplicity and to avoid potential race conditions if many comments are added, 
        // it's often better to just store newsId in Comment and query by that.
        // If you keep this, ensure your News model's comment field is set up for it.
        await news_model_js_1.default.updateOne({ _id: newsId }, { $addToSet: { comments: newComment._id } });
        // Populate userId before sending response
        const populatedComment = await comment_model_js_1.default.findById(newComment._id).populate('userId', 'name');
        return server_1.NextResponse.json(populatedComment, { status: 201 });
    }
    catch (err) {
        console.error(`Error adding comment to news ${newsId}:`, err);
        if (err.name === 'CastError')
            return server_1.NextResponse.json({ message: 'Invalid News ID format' }, { status: 400 });
        return server_1.NextResponse.json({ message: 'Error adding comment', error: err.message }, { status: 500 });
    }
}
async function GET(req, { params }) {
    await (0, mongodb_1.default)();
    const newsId = params.id;
    try {
        const { error: idValidationError } = rss_validation_js_1.idSchema.validate(newsId);
        if (idValidationError) {
            return server_1.NextResponse.json({ message: 'Validation Error for News ID', errors: [idValidationError.details[0].message] }, { status: 400 });
        }
        const newsItem = await news_model_js_1.default.findById(newsId);
        if (!newsItem) {
            return server_1.NextResponse.json({ message: 'News item not found' }, { status: 404 });
        }
        const comments = await comment_model_js_1.default.find({ newsId })
            .populate('userId', 'name') // Populate user name
            .sort({ createdAt: -1 });
        return server_1.NextResponse.json(comments);
    }
    catch (err) {
        console.error(`Error fetching comments for news ${newsId}:`, err);
        if (err.name === 'CastError')
            return server_1.NextResponse.json({ message: 'Invalid News ID format' }, { status: 400 });
        return server_1.NextResponse.json({ message: 'Error fetching comments', error: err.message }, { status: 500 });
    }
}
