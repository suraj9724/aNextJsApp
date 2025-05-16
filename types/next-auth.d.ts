import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
    /**
     * Returned by \`useSession\`, \`getSession\` and received as a prop on the \`SessionProvider\` React Context
     */
    interface Session {
        user: {
            /** The user's unique identifier. */
            id: string;
            /** The user's role. */
            role: string;
        } & DefaultSession["user"]; // Extends default user properties like name, email, image
    }

    /**
     * The shape of the user object returned in the OAuth providers' \`profile\` callback,
     * or the \`user\` object returned by the \`authorize\` callback of the Credentials provider.
     */
    interface User extends DefaultUser {
        role: string;
        // id is already part of DefaultUser
    }
}

declare module "next-auth/jwt" {
    /** Returned by the \`jwt\` callback and \`getToken\`, when using JWT sessions */
    interface JWT extends DefaultJWT {
        /** OpenID ID Token */
        idToken?: string;
        id: string;
        role: string;
    }
} 