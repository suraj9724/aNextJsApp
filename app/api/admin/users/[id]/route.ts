// Next.js server-side request/response types
import { NextResponse, NextRequest } from 'next/server';
// MongoDB connection utility
import dbConnect from '../../../../../lib/mongodb';
// Mongoose User model for database operations
import User from '../../../../../models/user.model';
// NextAuth session utility for server-side authentication
import { getServerSession } from "next-auth/next";
// Zod for schema validation - a TypeScript-first schema validation library
import { z } from 'zod';
// Import the authentication handler directly
import { authOptions } from "../../../auth/auth.config";

/**
 * Zod schema for validating user update requests
 * Defines the shape and validation rules for updating user data
 */
const updateUserSchema = z.object({
    // Name must be at least 1 character if provided
    name: z.string().min(1, { message: "Name is required" }).optional(),

    // Role must be either 'user' or 'admin'
    role: z.enum(["user", "admin"], {
        message: "Role must be either 'user' or 'admin'"
    }).optional(),

    // Avatar must be a valid URL or empty string
    avatar: z.string().url().optional().or(z.literal('')),

    // Note: Email and password updates are intentionally excluded:
    // - Email changes typically require verification
    // - Password changes should use a dedicated password reset flow
});

// Complex type definition to satisfy Next.js route context
export type RouteContext = {
    params: {
        id: string;
    } & Promise<{
        then: () => void;
        catch: () => void;
        finally: () => void;
        [Symbol.toStringTag]: string;
    }>;
}

/**
 * PUT handler for updating user information
 * @param req - The incoming request containing update data
 * @param params - Route parameters containing the user ID
 * @returns NextResponse with either success or error message
 */
export async function PUT(
    req: NextRequest,
    context: RouteContext
) {
    // Establish database connection
    await dbConnect();
    const { id } = context.params;

    // Verify admin privileges using NextAuth session
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
        return NextResponse.json(
            { message: 'Forbidden: Admin access required.' },
            { status: 403 }
        );
    }

    try {
        // Parse the request body
        const body = await req.json();

        // Validate against the Zod schema
        const validation = updateUserSchema.safeParse(body);

        if (!validation.success) {
            // Return validation errors if schema validation fails
            return NextResponse.json(
                {
                    message: "Validation Error",
                    errors: validation.error.flatten().fieldErrors
                },
                { status: 400 }
            );
        }

        // Prepare updates from validated data
        const updates = validation.data;

        // Handle empty avatar string (clear avatar)
        if (updates.avatar === '') {
            updates.avatar = undefined; // Will remove the avatar field
        }

        // Update user in database
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: updates }, // MongoDB set operator
            {
                new: true, // Return the updated document
                runValidators: true // Run model validators on update
            }
        ).select('-password'); // Exclude password field from response

        if (!updatedUser) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                message: 'User updated successfully',
                user: updatedUser
            }
        );

    } catch (error: any) {
        // console.error(`[API ADMIN UPDATE USER ID: ${id}] Error:`, error);
        return NextResponse.json(
            {
                message: 'Error updating user',
                error: error.message
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE handler for removing users
 * @param req - The incoming request
 * @param params - Route parameters containing the user ID
 * @returns NextResponse with either success or error message
 */
export async function DELETE(
    req: NextRequest,
    context: RouteContext
) {
    // Establish database connection
    await dbConnect();
    const { id } = context.params;

    // Verify admin privileges using NextAuth session
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
        return NextResponse.json(
            { message: 'Forbidden: Admin access required.' },
            { status: 403 }
        );
    }

    try {
        // Prevent admin from deleting themselves (safety measure)
        if ((session.user as any)?.id === id) {
            return NextResponse.json(
                { message: "Cannot delete your own admin account." },
                { status: 400 }
            );
        }

        // Delete user from database
        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: 'User deleted successfully' }
        );

    } catch (error: any) {
        // console.error(`[API ADMIN DELETE USER ID: ${id}] Error:`, error);
        return NextResponse.json(
            {
                message: 'Error deleting user',
                error: error.message
            },
            { status: 500 }
        );
    }
}