"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("../../../../lib/mongodb"));
const news_model_js_1 = __importDefault(require("../../../../models/news.model.js"));
async function GET(req) {
    await (0, mongodb_1.default)();
    try {
        // --- BEGIN IMPLEMENTED LOGIC for getNewsSubtypes ---
        const subtypes = await news_model_js_1.default.distinct('subtype');
        // Filter out null, undefined, or empty string subtypes
        const filteredSubtypes = subtypes.filter(subtype => subtype && String(subtype).trim() !== '');
        // --- END IMPLEMENTED LOGIC ---
        return server_1.NextResponse.json({ message: 'News subtypes retrieved successfully', data: filteredSubtypes });
    }
    catch (err) {
        console.error('Error fetching news subtypes:', err);
        return server_1.NextResponse.json({ message: 'Error fetching news subtypes', error: err.message }, { status: 500 });
    }
}
