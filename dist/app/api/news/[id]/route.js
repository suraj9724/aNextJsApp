"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../../lib/mongodb"));
const news_model_js_1 = __importDefault(require("../../../../models/news.model.js"));
const rss_validation_js_1 = require("../../../../validations/rss.validation.js"); // Reusing idSchema for param validation
const news_validation_js_1 = require("../../../../validations/news.validation.js"); // For PUT body validation
const rss_model_1 = __importDefault(require("../../../../models/rss.model"));
// import { getUserIdAndRoleFromRequest } from '../../../../lib/authUtils'; // Placeholder for your auth logic
// Placeholder for req.user. This needs to be replaced with your actual auth logic in Next.js
const getUserIdAndRoleFromRequest = async (req) => {
    console.warn('Auth bypass: Using placeholder user/admin for news/[id] routes');
    // For PUT/DELETE, admin is required. For GET, it might not be.
    const isWriteOperation = req.method === 'PUT' || req.method === 'DELETE';
    return {
        userId: 'PLACEHOLDER_USER_ID',
        userName: 'Placeholder User',
        isAdminUser: isWriteOperation ? true : false // Simulate admin for write ops for testing
    };
};
async function GET(req, { params }) {
    await (0, mongodb_1.default)();
    try {
        const { error: idValidationError } = rss_validation_js_1.idSchema.validate(params.id);
        if (idValidationError) {
            return server_1.NextResponse.json({ message: 'Validation Error for ID', errors: [idValidationError.details[0].message] }, { status: 400 });
        }
        const newsItem = await news_model_js_1.default.findById(params.id)
            .populate('source', 'Provider subtype')
            .populate('likedBy', 'name')
            .populate('dislikedBy', 'name');
        if (!newsItem) {
            return server_1.NextResponse.json({ message: 'News item not found' }, { status: 404 });
        }
        return server_1.NextResponse.json(newsItem);
    }
    catch (err) {
        console.error(`Error fetching news item ${params.id}:`, err);
        if (err.name === 'CastError')
            return server_1.NextResponse.json({ message: 'Invalid news ID format' }, { status: 400 });
        return server_1.NextResponse.json({ message: 'Error fetching news item', error: err.message }, { status: 500 });
    }
}
async function PUT(req, { params }) {
    await (0, mongodb_1.default)();
    const authCheck = await getUserIdAndRoleFromRequest(req);
    if (!authCheck.userId || !authCheck.isAdminUser) {
        return authCheck.error || server_1.NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }
    try {
        const { error: idValidationError } = rss_validation_js_1.idSchema.validate(params.id);
        if (idValidationError) {
            return server_1.NextResponse.json({ message: 'Validation Error for ID', errors: [idValidationError.details[0].message] }, { status: 400 });
        }
        const body = await req.json();
        const { error: bodyValidationError } = news_validation_js_1.newsSchema.validate(body); // Assuming full newsSchema for update
        if (bodyValidationError) {
            return server_1.NextResponse.json({ message: 'Validation Error for body', errors: bodyValidationError.details.map((d) => d.message) }, { status: 400 });
        }
        // Ensure source (RSSFeed ID) is not changed or is validated if it is part of body
        if (body.source) {
            const feed = await rss_model_1.default.findById(body.source);
            if (!feed) {
                return server_1.NextResponse.json({ message: 'RSS Feed not found for source' }, { status: 400 });
            }
        }
        const updatedNewsItem = await news_model_js_1.default.findByIdAndUpdate(params.id, {
            ...body,
            author: authCheck.userName, // Original logic: req.user.name for author on update
            // lastUpdated will be handled by timestamps: true in model
        }, { new: true, runValidators: true });
        if (!updatedNewsItem) {
            return server_1.NextResponse.json({ message: 'News item not found for update' }, { status: 404 });
        }
        return server_1.NextResponse.json(updatedNewsItem);
    }
    catch (err) {
        console.error(`Error updating news item ${params.id}:`, err);
        if (err.name === 'CastError')
            return server_1.NextResponse.json({ message: 'Invalid news ID format' }, { status: 400 });
        if (err.code === 11000)
            return server_1.NextResponse.json({ message: 'Duplicate key error (e.g. URL already exists)' }, { status: 400 });
        return server_1.NextResponse.json({ message: 'Error updating news item', error: err.message }, { status: 500 });
    }
}
async function DELETE(req, { params }) {
    await (0, mongodb_1.default)();
    const authCheck = await getUserIdAndRoleFromRequest(req);
    if (!authCheck.userId || !authCheck.isAdminUser) {
        return authCheck.error || server_1.NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }
    try {
        const { error: idValidationError } = rss_validation_js_1.idSchema.validate(params.id);
        if (idValidationError) {
            return server_1.NextResponse.json({ message: 'Validation Error for ID', errors: [idValidationError.details[0].message] }, { status: 400 });
        }
        const deletedNews = await news_model_js_1.default.findByIdAndDelete(params.id);
        if (!deletedNews) {
            return server_1.NextResponse.json({ message: 'News item not found for deletion' }, { status: 404 });
        }
        // Optionally: Delete associated comments here if desired
        // await Comment.deleteMany({ newsId: params.id });
        return server_1.NextResponse.json({ message: 'News item deleted successfully' });
    }
    catch (err) {
        console.error(`Error deleting news item ${params.id}:`, err);
        if (err.name === 'CastError')
            return server_1.NextResponse.json({ message: 'Invalid news ID format' }, { status: 400 });
        return server_1.NextResponse.json({ message: 'Error deleting news item', error: err.message }, { status: 500 });
    }
}
