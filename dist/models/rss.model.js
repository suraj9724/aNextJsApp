"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const rssSchema = new mongoose_1.default.Schema({
    createdBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Admin', // We'll need an Admin model too if this ref is important
        required: true
    },
    Provider: {
        type: String,
        required: true,
        default: 'Times of India'
    },
    subtype: {
        type: String,
        required: true,
        // enum: ['news', 'sports', 'entertainment', 'business', 'technology','top-stories']
    },
    rssLink: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (v) {
                return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v);
            },
            message: props => `${props.value} is not a valid URL!`
        }
    },
    datetimestamp: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
});
// Create model
// Ensure model is not re-defined if already compiled
const RSSFeed = mongoose_1.default.models.RSSFeed || mongoose_1.default.model('RSSFeed', rssSchema);
exports.default = RSSFeed;
