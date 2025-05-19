import Joi from 'joi';
import mongoose from 'mongoose';

// Custom validation for MongoDB ObjectId
const objectIdValidation = (value: string, helpers: Joi.CustomHelpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
    }
    return value;
};

interface NewsInput {
    title: string;
    content: string;
    url: string;
    publishedAt: Date;
    author?: string;
    source: string; // MongoDB ObjectId
    subtype: string;
}

const newsSchema = Joi.object<NewsInput>({
    title: Joi.string()
        .required()
        .trim()
        .max(500)
        .messages({
            'string.empty': 'Title is required',
            'string.max': 'Title must not exceed 500 characters',
            'any.required': 'Title is required'
        }),
    content: Joi.string()
        .required()
        .trim()
        .messages({
            'string.empty': 'Content is required',
            'any.required': 'Content is required'
        }),
    url: Joi.string()
        .uri()
        .required()
        .trim()
        .messages({
            'string.empty': 'URL is required',
            'string.uri': 'URL must be valid',
            'any.required': 'URL is required'
        }),
    publishedAt: Joi.date()
        .required()
        .messages({
            'date.base': 'Published date is required',
            'any.required': 'Published date is required'
        }),
    author: Joi.string()
        .trim()
        .max(200)
        .messages({
            'string.max': 'Author name must not exceed 200 characters'
        }),
    source: Joi.string()
        .required()
        .custom(objectIdValidation)
        .messages({
            'string.empty': 'RSS Feed ID is required',
            'any.required': 'RSS Feed ID is required',
            'any.invalid': 'Invalid RSS Feed ID format'
        }),
    subtype: Joi.string()
        .required()
        .trim()
        .min(2)
        .max(50)
        .messages({
            'string.empty': 'Subtype is required',
            'string.min': 'Subtype must be at least 2 characters long',
            'string.max': 'Subtype must not exceed 50 characters',
            'any.required': 'Subtype is required'
        })
});

export {
    newsSchema,
    type NewsInput
}; 