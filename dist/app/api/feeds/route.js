"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../lib/mongodb")); // Adjusted path
const rss_model_js_1 = __importDefault(require("../../../models/rss.model")); // Adjusted path, .js extension
const rss_validation_js_1 = require("../../../validations/rss.validation.js"); // Adjusted path, .js extension
const next_1 = require("next-auth/next"); // Import for session
const route_1 = require("../auth/[...nextauth]/route"); // Import your authOptions
// import Parser from 'rss-parser'; // We'll use this later for feed parsing logic
// Placeholder for req.user. This needs to be replaced with your actual auth logic in Next.js
// const getUserIdFromRequest = async (req: Request): Promise<string | null> => {
//     // Example: If using NextAuth.js, you might get the session here
//     // const session = await getServerSession(authOptions); // (authOptions would need to be defined)
//     // return session?.user?.id || null;
//     console.warn('Auth bypass: Using placeholder admin ID for testing createFeed');
//     return 'PLACEHOLDER_ADMIN_ID'; // Replace with actual admin user ID from your DB for testing if needed
// };
async function POST(req) {
    await (0, mongodb_1.default)();
    const session = await (0, next_1.getServerSession)(route_1.authOptions);
    if (!session) {
        return server_1.NextResponse.json({ message: 'Unauthorized: Please log in.' }, { status: 401 });
    }
    // @ts-ignore // NextAuth types can be tricky with custom session properties
    if (session.user?.role !== 'admin') {
        return server_1.NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
    }
    try {
        const body = await req.json();
        const { error } = rss_validation_js_1.createRssFeedSchema.validate(body);
        if (error) {
            return server_1.NextResponse.json({
                message: 'Validation Error',
                errors: error.details.map((d) => d.message)
            }, { status: 400 });
        }
        let { Provider, provider, subtype, rssLink } = body;
        Provider = Provider || provider; // Handle alias
        // @ts-ignore
        const adminId = session.user?.id; // Use the actual admin ID from the session
        // IMPORTANT: You will need to ensure this adminId corresponds to an actual Admin user in your DB
        // or temporarily remove the 'createdBy' requirement from the RssFeed model if it causes issues during initial setup.
        const existingFeed = await rss_model_js_1.default.findOne({ rssLink });
        if (existingFeed) {
            return server_1.NextResponse.json({ message: 'RSS feed already exists' }, { status: 400 });
        }
        const newFeed = new rss_model_js_1.default({
            Provider: Provider,
            subtype: subtype,
            rssLink: rssLink,
            createdBy: adminId, // This needs a valid Admin ObjectId
            // datetimestamp and lastUpdated will default from schema
        });
        await newFeed.save();
        return server_1.NextResponse.json(newFeed, { status: 201 });
    }
    catch (err) {
        console.error('Error creating RSS feed:', err);
        if (err.name === 'ValidationError') {
            const errors = {};
            Object.keys(err.errors).forEach(key => {
                errors[key] = err.errors[key].message;
            });
            return server_1.NextResponse.json({
                message: 'Validation failed',
                errors
            }, { status: 400 });
        }
        if (err.code === 11000) {
            return server_1.NextResponse.json({
                message: 'RSS feed with this URL already exists'
            }, { status: 400 });
        }
        return server_1.NextResponse.json({
            message: 'Error creating RSS feed',
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }, { status: 500 });
    }
}
async function GET(req) {
    await (0, mongodb_1.default)();
    const session = await (0, next_1.getServerSession)(route_1.authOptions);
    if (!session) {
        return server_1.NextResponse.json({ message: 'Unauthorized: Please log in.' }, { status: 401 });
    }
    // If you wanted only admins to list feeds, you would add role check here:
    // // @ts-ignore 
    // if (session.user?.role !== 'admin') {
    //     return NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
    // }
    try {
        const feeds = await rss_model_js_1.default.find().sort({ datetimestamp: -1 });
        return server_1.NextResponse.json(feeds);
    }
    catch (err) {
        console.error('Error fetching all RSS feeds:', err);
        return server_1.NextResponse.json({ message: err.message }, { status: 500 });
    }
}
