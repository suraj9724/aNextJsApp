"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../../lib/mongodb")); // Adjusted path
const rss_model_js_1 = __importDefault(require("../../../../models/rss.model")); // Adjusted path
const rss_validation_js_1 = require("../../../../validations/rss.validation.js"); // Adjusted path
// Placeholder for authentication and authorization logic
// In your Express app, these routes were protected by `auth` and `requireAdmin` middleware.
// You'll need to implement similar checks here based on your Next.js auth solution.
const checkAuthAndAdmin = async (req) => {
    // Example: Fetch session, check if user is admin
    // const session = await getServerSession(authOptions);
    // if (!session || !session.user) {
    //   return { authorized: false, error: NextResponse.json({ message: 'Authentication required' }, { status: 401 }) };
    // }
    // if (session.user.role !== 'admin') { // Assuming role is part of user object
    //   return { authorized: false, error: NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 }) };
    // }
    // return { authorized: true, userId: session.user.id };
    console.warn('Auth bypass: Placeholder for auth and admin check in /api/feeds/[id]');
    return { authorized: true, userId: 'PLACEHOLDER_ADMIN_ID' }; // Simulate authorized admin
};
async function GET(req, { params }) {
    await (0, mongodb_1.default)();
    // const authResult = await checkAuthAndAdmin(req);
    // if (!authResult.authorized) return authResult.error!;
    try {
        const { error: idValidationError } = rss_validation_js_1.idSchema.validate(params.id);
        if (idValidationError) {
            return server_1.NextResponse.json({
                message: 'Validation Error',
                errors: [idValidationError.details[0].message]
            }, { status: 400 });
        }
        const feed = await rss_model_js_1.default.findById(params.id);
        if (!feed) {
            return server_1.NextResponse.json({ message: 'RSS feed not found' }, { status: 404 });
        }
        // Original controller also checked if (!feed.isActive) but for GET, it might be okay to show it.
        // If you want to enforce only active feeds here, uncomment the below:
        // if (!feed.isActive) {
        //   return NextResponse.json({ message: 'This feed is currently inactive' }, { status: 400 });
        // }
        return server_1.NextResponse.json({ feedInfo: feed });
    }
    catch (err) {
        console.error('Error in GET /api/feeds/[id]:', err);
        if (err.name === 'CastError') { // Mongoose CastError for invalid ObjectId format
            return server_1.NextResponse.json({ message: 'Invalid feed ID format' }, { status: 400 });
        }
        return server_1.NextResponse.json({ message: 'Failed to fetch feed information', error: err.message }, { status: 500 });
    }
}
async function PUT(req, { params }) {
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
        const body = await req.json();
        const { error: bodyValidationError } = rss_validation_js_1.updateRssFeedSchema.validate(body);
        if (bodyValidationError) {
            return server_1.NextResponse.json({
                message: 'Validation Error for body',
                errors: bodyValidationError.details.map((d) => d.message)
            }, { status: 400 });
        }
        const { Provider, subtype, rssLink, isActive } = body;
        const updatedFeed = await rss_model_js_1.default.findByIdAndUpdate(params.id, { Provider, subtype, rssLink, isActive, lastUpdated: new Date() }, // Ensure lastUpdated is set
            { new: true, runValidators: true });
        if (!updatedFeed) {
            return server_1.NextResponse.json({ message: 'RSS feed not found' }, { status: 404 });
        }
        return server_1.NextResponse.json(updatedFeed);
    }
    catch (err) {
        console.error('Error in PUT /api/feeds/[id]:', err);
        if (err.name === 'CastError') {
            return server_1.NextResponse.json({ message: 'Invalid feed ID format' }, { status: 400 });
        }
        if (err.name === 'ValidationError') {
            const errors = {};
            Object.keys(err.errors).forEach(key => {
                errors[key] = err.errors[key].message;
            });
            return server_1.NextResponse.json({ message: 'Validation failed', errors }, { status: 400 });
        }
        if (err.code === 11000) { // Duplicate key error (e.g. rssLink)
            return server_1.NextResponse.json({ message: 'RSS feed with this URL already exists' }, { status: 400 });
        }
        return server_1.NextResponse.json({ message: 'Error updating RSS feed', error: err.message }, { status: 500 });
    }
}
async function DELETE(req, { params }) {
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
        const deletedFeed = await rss_model_js_1.default.findByIdAndDelete(params.id);
        if (!deletedFeed) {
            return server_1.NextResponse.json({ message: 'RSS feed not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ message: 'RSS feed deleted successfully' });
    }
    catch (err) {
        console.error('Error in DELETE /api/feeds/[id]:', err);
        if (err.name === 'CastError') {
            return server_1.NextResponse.json({ message: 'Invalid feed ID format' }, { status: 400 });
        }
        return server_1.NextResponse.json({ message: 'Error deleting RSS feed', error: err.message }, { status: 500 });
    }
}
