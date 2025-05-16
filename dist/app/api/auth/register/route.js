"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../../lib/mongodb"));
const user_model_js_1 = __importDefault(require("../../../../models/user.model"));
const user_validation_js_1 = require("../../../../validations/user.validation.js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function POST(req) {
    await (0, mongodb_1.default)();
    try {
        const body = await req.json();
        const { error } = user_validation_js_1.registerSchema.validate(body);
        if (error) {
            return server_1.NextResponse.json({ message: 'Validation Error', errors: error.details.map((d) => d.message) }, { status: 400 });
        }
        const { name, email, password } = body;
        const existingUser = await user_model_js_1.default.findOne({ email });
        if (existingUser) {
            return server_1.NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
        }
        const user = new user_model_js_1.default({
            name,
            email,
            password,
            role: 'user' // Default role
        });
        await user.save();
        if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
            // console.error('JWT_SECRET or JWT_EXPIRES_IN not defined in .env.local');
            return server_1.NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
        }
        const jwtOptions = {
            expiresIn: process.env.JWT_EXPIRES_IN
        };
        const token = jsonwebtoken_1.default.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, jwtOptions);
        // Decide on cookie vs. JSON response for token
        // Option 1: Return token in JSON response (client stores it)
        return server_1.NextResponse.json({
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
    }
    catch (err) {
        // console.error('Error during user registration:', err);
        // Handle potential duplicate key error for email if findOne check is bypassed (race condition)
        if (err.code === 11000 && err.keyPattern?.email) {
            return server_1.NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
        }
        return server_1.NextResponse.json({ message: 'Error registering user', error: err.message }, { status: 500 });
    }
}
