"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../../lib/mongodb"));
const user_model_1 = __importDefault(require("../../../../models/user.model")); // Assuming your user model is here
const next_1 = require("next-auth/next");
const route_1 = require("../../auth/[...nextauth]/route"); // Adjust path as necessary
async function GET(req) {
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
        // Fetch users, excluding the password field
        const users = await user_model_1.default.find({}).select('-password').lean();
        // If you only need the count:
        // const userCount = await User.countDocuments({});
        // return NextResponse.json({ count: userCount });
        return server_1.NextResponse.json(users);
    }
    catch (error) {
        // console.error('Error fetching users:', error);
        return server_1.NextResponse.json({ message: 'Error fetching users', error: error.message }, { status: 500 });
    }
}
