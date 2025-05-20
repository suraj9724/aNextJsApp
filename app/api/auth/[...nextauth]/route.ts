import NextAuth from "next-auth";
import { authOptions } from "../auth.config";
           
const handler = NextAuth(authOptions);

// Use dynamic route handlers
export { handler as GET, handler as POST };