import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/user.model';
import { loginSchema } from '../../../../validations/user.validation';
import jwt, { SignOptions } from 'jsonwebtoken';

/**
 * POST handler for admin login
 * Authenticates admin users and returns a JWT token upon successful login
 * @param req - The incoming Next.js request containing login credentials
 * @returns NextResponse with either:
 *   - Success response containing JWT token and user data (200)
 *   - Error response with appropriate status code (400, 401, 500)
 */
export async function POST(req: NextRequest) {
    // Establish database connection
    // await dbConnect();

    try {
        // STEP 1: Parse and validate request body
        // Convert the incoming JSON request body to a JavaScript object
        const body = await req.json();
        
        // Validate the request body against the login schema
        // Checks for required fields (email, password) and basic format validation
        const { error } = loginSchema.validate(body);
        if (error) {
            // Return 400 Bad Request if validation fails
            return NextResponse.json(
                { 
                    message: 'Validation Error', 
                    errors: error.details.map((d: any) => d.message) 
                }, 
                { status: 400 }
            );
        }

        // STEP 2: Extract credentials from request body
        const { email, password } = body;

        // STEP 3: Find admin user in database
        // Look for user with matching email AND role='admin'
        const adminUser = await User.findOne({ email, role: 'admin' });
        if (!adminUser) {
            // Return 401 Unauthorized if no admin user found
            // Generic message to avoid revealing whether email exists
            return NextResponse.json(
                { message: 'Invalid admin credentials or not an admin' }, 
                { status: 401 }
            );
        }

        // STEP 4: Verify password
        // Uses bcrypt (or similar) comparison via the User model method
        const isValidPassword = await adminUser.comparePassword(password);
        if (!isValidPassword) {
            // Return 401 Unauthorized if password doesn't match
            return NextResponse.json(
                { message: 'Incorrect email or password' }, 
                { status: 401 }
            );
        }

        // STEP 5: Check JWT environment variables
        // Ensure required configuration is present
        if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
            // console.error('JWT_SECRET or JWT_EXPIRES_IN not defined in .env.local');
            // Return 500 Internal Server Error for missing configuration
            return NextResponse.json(
                { message: 'Server configuration error' }, 
                { status: 500 }
            );
        }

        // STEP 6: Prepare JWT options
        const jwtOptions: SignOptions = {
            // Note: Type assertion needed due to potential type conflict with BSON StringValue
            expiresIn: process.env.JWT_EXPIRES_IN! as any
        };

        // STEP 7: Generate JWT token
        const token = jwt.sign(
            { 
                userId: adminUser._id,  // Include user ID in token payload
                role: adminUser.role   // Include role for authorization checks
            },
            process.env.JWT_SECRET!,   // Secret key from environment variables
            jwtOptions                // Token expiration settings
        );

        // STEP 8: Return successful login response
        return NextResponse.json({
            message: 'Admin login successful',
            token,  // The generated JWT token
            user: { // Basic user info (exclude sensitive data)
                id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                role: adminUser.role
            }
        });

    } catch (err: any) {
        // Handle any unexpected errors
        // console.error('Error during admin login:', err);
        return NextResponse.json(
            { 
                message: 'Error during admin login', 
                error: err.message 
            }, 
            { status: 500 }
        );
    }
}