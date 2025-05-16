import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/user.model';
import { registerSchema } from '../../../../validations/user.validation';
import jwt, { SignOptions } from 'jsonwebtoken';

export async function POST(req: NextRequest) {
    await dbConnect();

    try {
        const body = await req.json();
        const { error } = registerSchema.validate(body);
        if (error) {
            return NextResponse.json({ message: 'Validation Error', errors: error.details.map((d: any) => d.message) }, { status: 400 });
        }

        const { name, email, password } = body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
        }

        const user = new User({
            name,
            email,
            password,
            role: 'user' // Default role
        });

        await user.save();

        if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
            // console.error('JWT_SECRET or JWT_EXPIRES_IN not defined in .env.local');
            return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
        }

        const jwtOptions: SignOptions = {
            expiresIn: process.env.JWT_EXPIRES_IN! as any
        };

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET!,
            jwtOptions
        );

        // Decide on cookie vs. JSON response for token
        // Option 1: Return token in JSON response (client stores it)
        return NextResponse.json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        }, { status: 201 });

        // Option 2: Set httpOnly cookie (more secure for web, NextAuth.js does this)
        // const response = NextResponse.json(
        //   { message: 'User registered successfully', user: { id: user._id, name: user.name, email: user.email, role: user.role } }, 
        //   { status: 201 }
        // );
        // response.cookies.set('token', token, {
        //   httpOnly: true,
        //   secure: process.env.NODE_ENV !== 'development',
        //   sameSite: 'strict',
        //   maxAge: 60 * 60 * 24, // 1 day, adjust as needed, should align with JWT_EXPIRES_IN logic
        //   path: '/',
        // });
        // return response;

    } catch (err: any) {
        // console.error('Error during user registration:', err);
        // Handle potential duplicate key error for email if findOne check is bypassed (race condition)
        if (err.code === 11000 && err.keyPattern?.email) {
            return NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Error registering user', error: err.message }, { status: 500 });
    }
}