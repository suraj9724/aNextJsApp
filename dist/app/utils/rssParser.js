"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLatest = void 0;
const rss_parser_1 = __importDefault(require("rss-parser"));
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = __importDefault(require("xml2js"));
const mongoose_1 = __importDefault(require("mongoose"));
// Configure parser with extended timeout and headers
const parser = new rss_parser_1.default({
    timeout: 15000,
    maxRedirects: 5,
    requestOptions: {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/rss+xml, application/xml, text/xml'
        }
    }
});
// Custom XML parser with relaxed settings
const xmlParser = new xml2js_1.default.Parser({
    explicitArray: false,
    ignoreAttrs: true,
    async: true,
    strict: false,
    trim: true,
    normalize: true,
    normalizeTags: true,
    emptyTag: ''
});
// Clean XML content with comprehensive sanitization
function cleanXml(xml) {
    try {
        // Validate basic XML structure
        if (!/<\?xml|<rss|<feed/i.test(xml)) {
            throw new Error('Invalid XML - missing root element');
        }
        // Multi-stage cleaning process
        let cleaned = xml
            // Remove invalid control characters
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            // Handle CDATA sections
            .replace(/<!\[CDATA\[(.*?)\]\]>/g, (_, cdata) => cdata.replace(/&/g, '&amp;').replace(/</g, '&lt;'))
            // Remove XML declaration
            .replace(/<\?xml[^>]+\?>/, '')
            // Fix common malformed entities
            .replace(/&(?!(?:apos|quot|[gl]t|amp|#\d+);)/g, '&amp;')
            // Fix unescaped special chars
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Remove replacement characters
            .replace(/[\uFFFD]/g, '');
        // Validate balanced tags
        const openTags = (cleaned.match(/<[^/][^>]*>/g) || []).length;
        const closeTags = (cleaned.match(/<\/[^>]+>/g) || []).length;
        if (openTags !== closeTags) {
            console.warn(`Unbalanced tags detected (${openTags} open, ${closeTags} close)`);
        }
        return cleaned;
    }
    catch (err) {
        console.error('XML cleaning failed:', {
            error: err.message,
            sample: xml.substring(0, 200) + '...'
        });
        throw err; // Re-throw to trigger fallback
    }
}
const fetchLatest = async (feedUrl) => {
    try {
        if (!feedUrl) {
            throw new Error('No feed URL provided');
        }
        // Try direct parsing first
        try {
            const feed = await parser.parseURL(feedUrl);
            if (feed?.rss?.channel?.item?.length) {
                return processFeedItems(feed.rss.channel.item);
            }
        }
        catch (parseError) {
            //console.warn('Direct parse failed, trying fallback method:', parseError.message);
        }
        // Fallback: Download and manually parse
        const response = await axios_1.default.get(feedUrl, {
            timeout: 15000,
            responseType: 'text',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/rss+xml, application/xml, text/xml'
            }
        });
        const cleanedXml = cleanXml(response.data);
        const parsed = await xmlParser.parseStringPromise(cleanedXml);
        // Handle different RSS feed formats
        const items = parsed?.rss?.channel?.item ||
            parsed?.feed?.entry ||
            [];
        if (!items.length) {
            console.warn('No items found in RSS feed after cleaning');
            if (process.env.DEBUG_RSS) {
                console.debug('Cleaned XML sample:', cleanedXml.substring(0, 500));
            }
            return [];
        }
        return processFeedItems(items);
    }
    catch (error) {
        console.error('RSS fetch error:', {
            message: error.message,
            stack: error.stack,
            url: feedUrl,
            time: new Date().toISOString()
        });
        return [];
    }
};
exports.fetchLatest = fetchLatest;
function sanitizeHtmlContent(html) {
    if (!html)
        return '';
    // Convert HTML entities to their text equivalents
    const decoded = html
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    // Remove all HTML tags while preserving line breaks
    return decoded
        .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newlines
        .replace(/<\/p>|<\/div>/gi, '\n\n') // Convert closing block tags to double newlines
        .replace(/<[^>]+>/g, '') // Remove all remaining HTML tags
        .replace(/\n\s*\n/g, '\n\n') // Normalize whitespace
        .trim();
}
function processFeedItems(items) {
    return items.map((item) => ({
        title: item.title?.trim() || '',
        content: sanitizeHtmlContent(item.description || item.content || item.summary || ''),
        url: typeof item.link === 'object' ? item.link.href || '' : item.link || item.guid || '',
        publishedAt: getValidDate(item),
        source: new mongoose_1.default.Types.ObjectId(),
        author: getAuthorFromItem(item)
    }));
}
function getAuthorFromItem(item) {
    // Handle different RSS feed formats for author information
    if (typeof item.author === 'string') {
        return item.author.trim();
    }
    if (item.author?.name) {
        return item.author.name.trim();
    }
    if (item['dc:creator']) {
        return item['dc:creator'].trim();
    }
    if (item.creator) {
        return item.creator.trim();
    }
    return 'Unknown Author'; // Default if no author found
}
function getValidDate(item) {
    const dateStr = item.pubDate || item.published || item.updated || item.date;
    try {
        const date = dateStr ? new Date(dateStr) : new Date();
        // Ensure we return a valid date object
        return isNaN(date.getTime()) ? new Date() : date;
    }
    catch {
        return new Date();
    }
}
