"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const rssParser_1 = require("../../utils/rssParser");
async function GET(request) {
    const { searchParams } = new URL(request.url);
    const feedUrl = searchParams.get('feedUrl');
    if (!feedUrl) {
        return server_1.NextResponse.json({ error: 'Missing feedUrl parameter' }, { status: 400 });
    }
    try {
        const items = await (0, rssParser_1.fetchLatest)(feedUrl);
        return server_1.NextResponse.json(items);
    }
    catch (error) {
        console.error('API error fetching RSS feed:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch or parse RSS feed' }, { status: 500 });
    }
}
