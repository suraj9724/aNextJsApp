"use strict";
const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({
    comment: {
        type: String,
        required: true,
        trim: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Refers to the User model we just copied
        required: true
    },
    newsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Newsfeeds', // Refers to the News model (named Newsfeeds in its definition)
        required: true
    },
    replies: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Comment' // Self-reference for nested replies
        }]
}, {
    timestamps: true
});
const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
module.exports = Comment;
