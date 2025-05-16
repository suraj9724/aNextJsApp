import mongoose, { Document, Model, Schema } from 'mongoose';

interface IRSSFeed extends Document {
    createdBy: mongoose.Types.ObjectId;
    Provider: string;
    subtype: string;
    rssLink: string;
    datetimestamp: Date;
    lastUpdated: Date;
    isActive: boolean;
}

const rssSchema = new Schema<IRSSFeed>({
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Admin',
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
    },
    rssLink: {
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

const RSSFeed: Model<IRSSFeed> = mongoose.models.RSSFeed || mongoose.model<IRSSFeed>('RSSFeed', rssSchema);

export default RSSFeed; 