import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import News from '../../../../models/news.model';

export async function GET(req: NextRequest) {
    await dbConnect();

    try {
        // --- BEGIN IMPLEMENTED LOGIC for getNewsSubtypes ---
        const subtypes = await News.distinct('subtype');
        // Filter out null, undefined, or empty string subtypes
        const filteredSubtypes = subtypes.filter(subtype => subtype && String(subtype).trim() !== '');
        // --- END IMPLEMENTED LOGIC ---

        return NextResponse.json({ message: 'News subtypes retrieved successfully', data: filteredSubtypes });

    } catch (err: any) {
        console.error('Error fetching news subtypes:', err);
        return NextResponse.json({ message: 'Error fetching news subtypes', error: err.message }, { status: 500 });
    }
} 