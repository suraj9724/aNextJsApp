"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUT = PUT;
exports.DELETE = DELETE;
// Next.js server-side request/response types
const server_1 = require("next/server");
// MongoDB connection utility
const mongodb_1 = __importDefault(require("../../../../../lib/mongodb"));
// Mongoose User model for database operations
const user_model_1 = __importDefault(require("../../../../../models/user.model"));
// NextAuth session utility for server-side authentication
const next_1 = require("next-auth/next");
// NextAuth configuration options
const route_1 = require("../../../auth/[...nextauth]/route"); // Adjust path as needed
// Zod for schema validation - a TypeScript-first schema validation library
const zod_1 = require("zod");
/**
 * Zod schema for validating user update requests
 * Defines the shape and validation rules for updating user data
 */
const updateUserSchema = zod_1.z.object({
    // Name must be at least 1 character if provided
    name: zod_1.z.string().min(1, { message: "Name is required" }).optional(),
    // Role must be either 'user' or 'admin'
    role: zod_1.z.enum(["user", "admin"], {
        message: "Role must be either 'user' or 'admin'"
    }).optional(),
    // Avatar must be a valid URL or empty string
    avatar: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    // Note: Email and password updates are intentionally excluded:
    // - Email changes typically require verification
    // - Password changes should use a dedicated password reset flow
});
/**
 * PUT handler for updating user information
 * @param req - The incoming request containing update data
 * @param params - Route parameters containing the user ID
 * @returns NextResponse with either success or error message
 */
async function PUT(req, { params }) {
    // Establish database connection
    await (0, mongodb_1.default)();
    const { id } = params;
    // Verify admin privileges using NextAuth session
    const session = await (0, next_1.getServerSession)(route_1.authOptions);
    if (!session || session.user?.role !== 'admin') {
        return server_1.NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
    }
    try {
        // Parse the request body
        const body = await req.json();
        // Validate against the Zod schema
        const validation = updateUserSchema.safeParse(body);
        if (!validation.success) {
            // Return validation errors if schema validation fails
            return server_1.NextResponse.json({
                message: "Validation Error",
                errors: validation.error.flatten().fieldErrors
            }, { status: 400 });
        }
        // Prepare updates from validated data
        const updates = validation.data;
        // Handle empty avatar string (clear avatar)
        if (updates.avatar === '') {
            updates.avatar = undefined; // Will remove the avatar field
        }
        // Update user in database
        const updatedUser = await user_model_1.default.findByIdAndUpdate(id, { $set: updates }, // MongoDB set operator
        {
            new: true, // Return the updated document
            runValidators: true // Run model validators on update
        }).select('-password'); // Exclude password field from response
        if (!updatedUser) {
            return server_1.NextResponse.json({ message: 'User not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({
            message: 'User updated successfully',
            user: updatedUser
        });
    }
    catch (error) {
        // console.error(`[API ADMIN UPDATE USER ID: ${id}] Error:`, error);
        return server_1.NextResponse.json({
            message: 'Error updating user',
            error: error.message
        }, { status: 500 });
    }
}
/**
 * DELETE handler for removing users
 * @param req - The incoming request
 * @param params - Route parameters containing the user ID
 * @returns NextResponse with either success or error message
 */
async function DELETE(req, { params }) {
    // Establish database connection
    await (0, mongodb_1.default)();
    const { id } = params;
    // Verify admin privileges using NextAuth session
    const session = await (0, next_1.getServerSession)(route_1.authOptions);
    if (!session || session.user?.role !== 'admin') {
        return server_1.NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
    }
    try {
        // Prevent admin from deleting themselves (safety measure)
        if (session.user?.id === id) {
            return server_1.NextResponse.json({ message: "Cannot delete your own admin account." }, { status: 400 });
        }
        // Delete user from database
        const deletedUser = await user_model_1.default.findByIdAndDelete(id);
        if (!deletedUser) {
            return server_1.NextResponse.json({ message: 'User not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        // console.error(`[API ADMIN DELETE USER ID: ${id}] Error:`, error);
        return server_1.NextResponse.json({
            message: 'Error deleting user',
            error: error.message
        }, { status: 500 });
    }
}
