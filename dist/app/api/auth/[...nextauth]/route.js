"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = exports.authOptions = void 0;
const next_auth_1 = __importDefault(require("next-auth"));
const credentials_1 = __importDefault(require("next-auth/providers/credentials"));
const mongodb_1 = __importDefault(require("../../../../lib/mongodb")); // Adjust path as necessary
const user_model_js_1 = __importDefault(require("../../../../models/user.model.js")); // Adjust path as necessary
const bcryptjs_1 = __importDefault(require("bcryptjs")); // Ensure bcryptjs is installed
exports.authOptions = {
    providers: [
        (0, credentials_1.default)({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Please provide email and password.");
                }
                await (0, mongodb_1.default)();
                const user = await user_model_js_1.default.findOne({ email: credentials.email }).select("+password");
                if (!user) {
                    // console.log("No user found with email:", credentials.email);
                    throw new Error("Invalid credentials.");
                }
                const isPasswordValid = await bcryptjs_1.default.compare(credentials.password, user.password);
                if (!isPasswordValid) {
                    // console.log("Password validation failed for user:", credentials.email);
                    throw new Error("Invalid credentials.");
                }
                // console.log("User authenticated:", user.email, "Role:", user.role);
                // Return an object that will be encoded in the JWT.
                // Ensure it includes all necessary user info like id and role.
                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    // Do NOT return the password hash
                };
            }
        })
    ],
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: '/login', // Optional: if you have a custom login page at /login
        // error: '/auth/error', // Error code passed in query string as ?error=
    },
    callbacks: {
        async jwt({ token, user, account, profile }) {
            // The user object is available only on sign-in.
            // On subsequent calls, only the token is available.
            if (user) {
                token.id = user.id;
                token.role = user.role; // user object from authorize has role
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },
        async session({ session, token }) {
            // token contains the data we put in it via the jwt callback
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                // session.user.email and session.user.name are usually already populated by NextAuth
            }
            return session;
        },
    },
};
const handler = (0, next_auth_1.default)(exports.authOptions);
exports.GET = handler;
exports.POST = handler;
