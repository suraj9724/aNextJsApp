"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const user_model_js_1 = __importDefault(require("../../../../models/user.model.js"));
const user_validation_js_1 = require("../../../../validations/user.validation.js"); // Can reuse for basic field validation
const route_1 = require("../../auth/[...nextauth]/route");
const next_auth_1 = require("next-auth");
/**
 * Placeholder authentication function for admin routes
 * In a real application, this would verify the JWT and check admin privileges
 * @param req - The incoming Next.js request object
 * @returns Object containing either the authenticated admin user or an error response
 */
const getAuthenticatedAdminFromRequest = async (req) => {
    // TODO: Implement proper authentication in a production environment:
    // 1. Extract JWT from Authorization header
    // 2. Verify JWT using process.env.JWT_SECRET
    // 3. Fetch the user from DB using userId from decoded token
    // 4. Check if user.role is 'admin'
    // If any step fails, return { user: null, error: NextResponse.json(...) }
    // console.warn('Auth bypass: Placeholder admin for /admin/create route');
    // For testing purposes only - bypasses actual authentication
    // In production, this MUST be replaced with proper JWT verification and role checking
    // return { user: { _id: 'PLACEHOLDER_EXISTING_ADMIN_ID', role: 'admin' } };
    const session = await (0, next_auth_1.getServerSession)(route_1.authOptions);
    if (!session) {
        return { user: null, error: server_1.NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
    }
    const user = await user_model_js_1.default.findById(session.user.id);
    if (!user || user.role !== 'admin') {
        return { user: null, error: server_1.NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 }) };
    }
    return { user: user };
};
/**
 * POST handler for creating new admin users
 * Only authenticated admins can access this endpoint
 * @param req - The incoming Next.js request object
 * @returns NextResponse with either success data or error message
 */
async function POST(req) {
    // Connect to MongoDB database
    // await dbConnect();
    // Check if the requesting user is authenticated and has admin role
    const authResult = await getAuthenticatedAdminFromRequest(req);
    if (!authResult.user || authResult.user.role !== 'admin') {
        // Return 403 Forbidden if user is not an admin
        return authResult.error || server_1.NextResponse.json({ message: 'Forbidden: Admin access required to create admins' }, { status: 403 });
    }
    try {
        // Parse the request body
        const body = await req.json();
        // Validate the request body against the registration schema
        // This ensures required fields (name, email, password) are present and valid
        const { error } = user_validation_js_1.registerSchema.validate(body);
        if (error) {
            // Return 400 Bad Request if validation fails
            return server_1.NextResponse.json({
                message: 'Validation Error',
                errors: error.details.map((d) => d.message)
            }, { status: 400 });
        }
        // Extract required fields from the request body
        const { name, email, password } = body;
        // Check if a user with this email already exists
        const existingUser = await user_model_js_1.default.findOne({ email });
        if (existingUser) {
            // Return 400 Bad Request if email is already in use
            return server_1.NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
        }
        // Create a new admin user with the provided data
        const newAdmin = new user_model_js_1.default({
            name,
            email,
            password, // Note: The password should be hashed by the User model pre-save hook
            role: 'admin' // Explicitly set role to admin
        });
        // Save the new admin to the database
        await newAdmin.save();
        // Return success response (201 Created) with the new admin's details
        // Note: We don't return the password or other sensitive fields
        return server_1.NextResponse.json({
            message: 'Admin user created successfully',
            user: {
                id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email,
                role: newAdmin.role
            }
        }, { status: 201 });
    }
    catch (err) {
        // console.error('Error creating admin user:', err);
        // Handle duplicate email error (even though we checked earlier, race conditions could occur)
        if (err.code === 11000 && err.keyPattern?.email) {
            return server_1.NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
        }
        // Return 500 Internal Server Error for any other unexpected errors
        return server_1.NextResponse.json({
            message: 'Error creating admin user',
            error: err.message
        }, { status: 500 });
    }
}
