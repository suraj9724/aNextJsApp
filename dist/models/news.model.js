"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const newsSchema = new mongoose_1.default.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        trim: true
    },
    url: {
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
    publishedAt: {
        type: Date,
        required: true,
        index: -1
    },
    author: {
        type: String,
        trim: true
    },
    source: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'RSSFeed', // This should link to the RSSFeed model we already copied
        required: true
    },
    subtype: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    likes: {
        type: Number,
        default: 0
    },
    dislikes: {
        type: Number,
        default: 0
    },
    likedBy: [{
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'User' // User model will be needed
        }],
    dislikedBy: [{
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'User' // User model will be needed
        }],
    comments: [{
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'Comment' // Comment model will be needed
        }]
}, {
    timestamps: true
});
// Indexes for better query performance
newsSchema.index({ title: 'text', description: 'text', content: 'text' });
newsSchema.index({ subtype: 1 });
// Add static method for bulk upsert
newsSchema.statics.bulkUpsert = async function (items) {
    const bulkOps = items.map(item => ({
        updateOne: {
            filter: { url: item.url }, // Use url as unique identifier
            update: { $set: item },
            upsert: true
        }
    }));
    return this.bulkWrite(bulkOps);
};
// const News = mongoose.model('Newsfeeds', newsSchema);
// Ensure model is not re-defined if already compiled
const News = mongoose_1.default.models.Newsfeeds || mongoose_1.default.model('Newsfeeds', newsSchema);
exports.default = News;
