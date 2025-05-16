"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../../../lib/mongodb"));
const news_model_js_1 = __importDefault(require("../../../../../models/news.model.js"));
const rss_validation_js_1 = require("../../../../../validations/rss.validation.js"); // For param validation
const route_1 = require("../../../auth/[...nextauth]/route");
const next_auth_1 = require("next-auth");
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
        return authCheck.error || server_1.NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }
    const userId = authCheck.userId;
    try {
        const { error: idValidationError } = rss_validation_js_1.idSchema.validate(params.id);
        if (idValidationError) {
            return server_1.NextResponse.json({ message: 'Validation Error for ID', errors: [idValidationError.details[0].message] }, { status: 400 });
        }
        const newsItem = await news_model_js_1.default.findById(params.id);
        if (!newsItem) {
            return server_1.NextResponse.json({ message: 'News item not found' }, { status: 404 });
        }
        const isLiked = newsItem.likedBy.includes(userId);
        const isDisliked = newsItem.dislikedBy.includes(userId);
        let updateQuery = {};
        if (isLiked) { // Already liked, so unlike
            updateQuery = { $inc: { likes: -1 }, $pull: { likedBy: userId } };
        }
        else if (isDisliked) { // Was disliked, change to like
            updateQuery = { $inc: { likes: 1, dislikes: -1 }, $pull: { dislikedBy: userId }, $addToSet: { likedBy: userId } };
        }
        else { // New like
            updateQuery = { $inc: { likes: 1 }, $addToSet: { likedBy: userId } };
        }
        await news_model_js_1.default.updateOne({ _id: params.id }, updateQuery);
        const updatedNews = await news_model_js_1.default.findById(params.id).select('likes dislikes likedBy dislikedBy'); // Select only relevant fields
        return server_1.NextResponse.json({
            message: 'News like status updated successfully',
            likes: updatedNews?.likes,
            dislikes: updatedNews?.dislikes,
            // likedBy: updatedNews?.likedBy, // Optionally return the full arrays
            // dislikedBy: updatedNews?.dislikedBy
        });
    }
    catch (err) {
        console.error(`Error liking news item ${params.id}:`, err);
        if (err.name === 'CastError')
            return server_1.NextResponse.json({ message: 'Invalid news ID format' }, { status: 400 });
        return server_1.NextResponse.json({ message: 'Error liking news item', error: err.message }, { status: 500 });
    }
}
