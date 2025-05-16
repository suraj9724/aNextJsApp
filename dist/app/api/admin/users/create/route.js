"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../../../lib/mongodb"));
const user_model_1 = __importDefault(require("../../../../../models/user.model"));
const next_1 = require("next-auth/next");
const route_1 = require("../../../auth/[...nextauth]/route"); // Adjust path as per your authOptions location
const zod_1 = require("zod");
// Schema for validating the request body for creating a user
const createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, { message: "Name is required" }),
    email: zod_1.z.string().email({ message: "Invalid email address" }),
    password: zod_1.z.string().min(6, { message: "Password must be at least 6 characters" }),
    role: zod_1.z.enum(["user", "admin"], { message: "Role must be either 'user' or 'admin'" }),
    avatar: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
});
async function POST(req) {
    await (0, mongodb_1.default)();
    const session = await (0, next_1.getServerSession)(route_1.authOptions);
    if (!session) {
        return server_1.NextResponse.json({ message: 'Unauthorized: Please log in.' }, { status: 401 });
    }
    // @ts-ignore
    if (session.user?.role !== 'admin') {
        return server_1.NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
    }
    try {
        const body = await req.json();
        const validation = createUserSchema.safeParse(body);
        if (!validation.success) {
            return server_1.NextResponse.json({ message: "Validation Error", errors: validation.error.flatten().fieldErrors }, { status: 400 });
        }
        const { name, email, password, role, avatar } = validation.data;
        const existingUser = await user_model_1.default.findOne({ email });
        if (existingUser) {
            return server_1.NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
        }
        const newUser = new user_model_1.default({
            name,
            email,
            password, // Password will be hashed by the pre-save hook in user.model.js
            role,
            avatar: avatar || undefined, // Store undefined if empty string to avoid saving empty avatar strings
        });
        await newUser.save();
        // Exclude password from the returned user object
        const userResponse = newUser.toObject();
        delete userResponse.password;
        return server_1.NextResponse.json({ message: 'User created successfully', user: userResponse }, { status: 201 });
    }
    catch (error) {
        // console.error('[API ADMIN CREATE USER] Error:', error);
        // Handle potential duplicate key error for email if findOne check is bypassed (race condition)
        if (error.code === 11000 && error.keyPattern?.email) {
            return server_1.NextResponse.json({ message: 'User with this email already exists (race condition)' }, { status: 400 });
        }
        return server_1.NextResponse.json({ message: 'Error creating user', error: error.message }, { status: 500 });
    }
}
