import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/user.model'; // Assuming your user model is here
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route"; // Adjust path as necessary

export async function GET(req: NextRequest) {
    await dbConnect();

    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized: Please log in.' }, { status: 401 });
    }

    // @ts-ignore // NextAuth types can be tricky with custom session properties
    if (session.user?.role !== 'admin') {
        return NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    try {
        // Fetch users, excluding the password field
        const users = await User.find({}).select('-password').lean();

        // If you only need the count:
        // const userCount = await User.countDocuments({});
        // return NextResponse.json({ count: userCount });

        return NextResponse.json(users);

    } catch (error: any) {
        // console.error('Error fetching users:', error);
        return NextResponse.json(
            { message: 'Error fetching users', error: error.message },
            { status: 500 }
        );
    }
} 