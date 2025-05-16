import mongoose, { Document, Model, Schema } from 'mongoose';

interface IComment extends Document {
    comment: string;
    userId: mongoose.Types.ObjectId;
    newsId: mongoose.Types.ObjectId;
    replies: mongoose.Types.ObjectId[];
}

const commentSchema = new Schema<IComment>({
    comment: {
        type: String,
        required: true,
        trim: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    newsId: {
        type: Schema.Types.ObjectId,
        ref: 'Newsfeeds',
        required: true
    },
    replies: [{
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    }]
}, {
    timestamps: true
});

const Comment: Model<IComment> = mongoose.models.Comment || mongoose.model<IComment>('Comment', commentSchema);

export default Comment; 