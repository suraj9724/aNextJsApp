import NextAuth from "next-auth";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "../../../../lib/mongodb"; // Adjust path as necessary
import User, { IUser } from "../../../../models/user.model"; // Adjust path as necessary
import bcrypt from "bcryptjs"; // Ensure bcryptjs is installed

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials): Promise<any> {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Please provide email and password.");
                }

                await dbConnect();

                const user = await User.findOne({ email: credentials.email }).select("+password").lean();

                if (!user) {
                    // console.log("No user found with email:", credentials.email);
                    throw new Error("Invalid credentials.");
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

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
                token.role = (user as any).role; // user object from authorize has role
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },
        async session({ session, token }) {
            // token contains the data we put in it via the jwt callback
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                // session.user.email and session.user.name are usually already populated by NextAuth
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 