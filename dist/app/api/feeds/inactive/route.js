"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../../lib/mongodb"));
const rss_model_js_1 = __importDefault(require("../../../../models/rss.model"));
// Placeholder for authentication and authorization logic if needed
// Original Express route for inactive feeds did not specify auth, but you might want to add it.
const checkAuth = async (req) => {
    console.warn('Auth bypass: Placeholder for auth check in /api/feeds/inactive');
    return { authorized: true };
};
async function GET(req) {
    await (0, mongodb_1.default)();
    // const authResult = await checkAuth(req);
    // if (!authResult.authorized) return authResult.error!;
    try {
        // --- BEGIN IMPLEMENTED LOGIC for getInactiveFeeds ---
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;
        const query = { isActive: false };
        const inactiveFeeds = await rss_model_js_1.default.find(query)
            .sort({ Provider: 1 }) // Sort by Provider name ascending
            .skip(skip)
            .limit(limit)
            .select('-newsItems'); // Exclude potentially large newsItems array if embedded
        const totalInactiveFeeds = await rss_model_js_1.default.countDocuments(query);
        // --- END IMPLEMENTED LOGIC ---
        return server_1.NextResponse.json({
            message: 'Inactive feeds retrieved successfully',
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalInactiveFeeds / limit),
                totalItems: totalInactiveFeeds,
                itemsPerPage: limit
            },
            data: inactiveFeeds
        });
    }
    catch (err) {
        console.error('Error in GET /api/feeds/inactive:', err);
        return server_1.NextResponse.json({ message: 'Error fetching inactive feeds', error: err.message }, { status: 500 });
    }
}
