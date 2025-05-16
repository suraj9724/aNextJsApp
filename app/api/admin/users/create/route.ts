import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import User from '../../../../../models/user.model';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route"; // Adjust path as per your authOptions location
import { z } from 'zod';

// Schema for validating the request body for creating a user
const createUserSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    role: z.enum(["user", "admin"], { message: "Role must be either 'user' or 'admin'" }),
    avatar: z.string().url().optional().or(z.literal('')),
});

export async function POST(req: NextRequest) {
    await dbConnect();

    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized: Please log in.' }, { status: 401 });
    }
    // @ts-ignore
    if (session.user?.role !== 'admin') {
        return NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const validation = createUserSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ message: "Validation Error", errors: validation.error.flatten().fieldErrors }, { status: 400 });
        }

        const { name, email, password, role, avatar } = validation.data;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
        }

        const newUser = new User({
            name,
            email,
            password, // Password will be hashed by the pre-save hook in user.model.js
            role,
            avatar: avatar || undefined, // Store undefined if empty string to avoid saving empty avatar strings
        });

        await newUser.save();

        // Exclude password from the returned user object
        const userResponse = newUser.toObject() as { password?: string;[key: string]: any };
        delete userResponse.password;

        return NextResponse.json({ message: 'User created successfully', user: userResponse }, { status: 201 });

    } catch (error: any) {
        // console.error('[API ADMIN CREATE USER] Error:', error);
        // Handle potential duplicate key error for email if findOne check is bypassed (race condition)
        if (error.code === 11000 && error.keyPattern?.email) {
            return NextResponse.json({ message: 'User with this email already exists (race condition)' }, { status: 400 });
        }
        return NextResponse.json(
            { message: 'Error creating user', error: error.message },
            { status: 500 }
        );
    }
} 