import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/user.model.js';
import { loginSchema } from '../../../../validations/user.validation.js';
import jwt, { SignOptions } from 'jsonwebtoken';

export async function POST(req: NextRequest) {
    await dbConnect();

    try {
        const body = await req.json();
        const { error } = loginSchema.validate(body);
        if (error) {
            return NextResponse.json({ message: 'Validation Error', errors: error.details.map((d: any) => d.message) }, { status: 400 });
        }

        const { email, password } = body;

        // Original controller only allowed 'user' role to login here.
        // Consider if admins should also use this or a separate login.
        const user = await User.findOne({ email /*, role: 'user' */ });

        if (!user) {
            return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
        }

        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
        }

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

        return NextResponse.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err: any) {
        // console.error('Error during user login:', err);
        return NextResponse.json({ message: 'Error logging in', error: err.message }, { status: 500 });
    }
} 