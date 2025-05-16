import mongoose, { Document, Model, Schema } from 'mongoose';
import { BulkWriteResult } from 'mongodb';

export interface INews extends Document {
    title: string;
    content?: string;
    url: string;
    publishedAt: Date;
    author?: string;
    source: mongoose.Types.ObjectId;
    subtype: string;
    isActive: boolean;
    likes: number;
    dislikes: number;
    likedBy: mongoose.Types.ObjectId[];
    dislikedBy: mongoose.Types.ObjectId[];
    comments: mongoose.Types.ObjectId[];
}

type NewsModelType = Model<INews, {}, { bulkUpsert: (items: Partial<INews>[]) => Promise<BulkWriteResult> }>;

const newsSchema = new Schema<INews, NewsModelType>({
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
            validator: function (v: string): boolean {
                return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v);
            },
            message: (props: { value: string }) => `${props.value} is not a valid URL!`
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
        type: Schema.Types.ObjectId,
        ref: 'RSSFeed',
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
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    dislikedBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    }]
}, {
    timestamps: true,
    statics: {
        bulkUpsert: async function (items: Partial<INews>[]): Promise<BulkWriteResult> {
            const bulkOps = items.map(item => ({
                updateOne: {
                    filter: { url: item.url },
                    update: { $set: item },
                    upsert: true
                }
            }));
            return this.bulkWrite(bulkOps);
        }
    }
});

// Indexes for better query performance
newsSchema.index({ title: 'text', description: 'text', content: 'text' });
newsSchema.index({ subtype: 1 });

const News = (mongoose.models.Newsfeeds || mongoose.model<INews, NewsModelType>('Newsfeeds', newsSchema)) as NewsModelType;

export default News; 