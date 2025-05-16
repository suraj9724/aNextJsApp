import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/user.model.js';
import { registerSchema } from '../../../../validations/user.validation.js'; // Can reuse for basic field validation
import jwt from 'jsonwebtoken'; // For decoding the token of the requesting admin
import { authOptions } from '../../auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';

/**
 * Placeholder authentication function for admin routes
 * In a real application, this would verify the JWT and check admin privileges
 * @param req - The incoming Next.js request object
 * @returns Object containing either the authenticated admin user or an error response
 */
const getAuthenticatedAdminFromRequest = async (req: NextRequest): Promise<{ user: any | null; error?: NextResponse }> => {
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

    const session = await getServerSession(authOptions);
    if (!session) {
        return { user: null, error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
    }

    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
        return { user: null, error: NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 }) };
    }
    return { user: user };  
};

/**
 * POST handler for creating new admin users
 * Only authenticated admins can access this endpoint
 * @param req - The incoming Next.js request object
 * @returns NextResponse with either success data or error message
 */
export async function POST(req: NextRequest) {
    // Connect to MongoDB database
    // await dbConnect();

    // Check if the requesting user is authenticated and has admin role
    const authResult = await getAuthenticatedAdminFromRequest(req);
    if (!authResult.user || authResult.user.role !== 'admin') {
        // Return 403 Forbidden if user is not an admin
        return authResult.error || NextResponse.json({ message: 'Forbidden: Admin access required to create admins' }, { status: 403 });
    }

    try {
        // Parse the request body
        const body = await req.json();
        
        // Validate the request body against the registration schema
        // This ensures required fields (name, email, password) are present and valid
        const { error } = registerSchema.validate(body);
        if (error) {
            // Return 400 Bad Request if validation fails
            return NextResponse.json({ 
                message: 'Validation Error', 
                errors: error.details.map((d: any) => d.message) 
            }, { status: 400 });
        }

        // Extract required fields from the request body
        const { name, email, password } = body;

        // Check if a user with this email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // Return 400 Bad Request if email is already in use
            return NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
        }

        // Create a new admin user with the provided data
        const newAdmin = new User({
            name,
            email,
            password, // Note: The password should be hashed by the User model pre-save hook
            role: 'admin' // Explicitly set role to admin
        });

        // Save the new admin to the database
        await newAdmin.save();

        // Return success response (201 Created) with the new admin's details
        // Note: We don't return the password or other sensitive fields
        return NextResponse.json({
            message: 'Admin user created successfully',
            user: {
                id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email,
                role: newAdmin.role
            }
        }, { status: 201 });

    } catch (err: any) {
        // console.error('Error creating admin user:', err);
        
        // Handle duplicate email error (even though we checked earlier, race conditions could occur)
        if (err.code === 11000 && err.keyPattern?.email) {
            return NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
        }
        
        // Return 500 Internal Server Error for any other unexpected errors
        return NextResponse.json({ 
            message: 'Error creating admin user', 
            error: err.message 
        }, { status: 500 });
    }
}