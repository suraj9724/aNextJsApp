"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../../lib/mongodb"));
const user_model_js_1 = __importDefault(require("../../../../models/user.model.js"));
const user_validation_js_1 = require("../../../../validations/user.validation.js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function POST(req) {
    await (0, mongodb_1.default)();
    try {
        const body = await req.json();
        const { error } = user_validation_js_1.loginSchema.validate(body);
        if (error) {
            return server_1.NextResponse.json({ message: 'Validation Error', errors: error.details.map((d) => d.message) }, { status: 400 });
        }
        const { email, password } = body;
        // Original controller only allowed 'user' role to login here.
        // Consider if admins should also use this or a separate login.
        const user = await user_model_js_1.default.findOne({ email /*, role: 'user' */ });
        if (!user) {
            return server_1.NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
        }
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return server_1.NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
        }
        if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
            // console.error('JWT_SECRET or JWT_EXPIRES_IN not defined in .env.local');
            return server_1.NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
        }
        const jwtOptions = {
            expiresIn: process.env.JWT_EXPIRES_IN
        };
        const token = jsonwebtoken_1.default.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, jwtOptions);
        return server_1.NextResponse.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (err) {
        // console.error('Error during user login:', err);
        return server_1.NextResponse.json({ message: 'Error logging in', error: err.message }, { status: 500 });
    }
}
