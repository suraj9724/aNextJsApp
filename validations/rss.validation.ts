import Joi from 'joi';
import mongoose from 'mongoose';

// Custom validation for MongoDB ObjectId
const objectIdValidation = (value: string, helpers: Joi.CustomHelpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
    }
    return value;
};

// RSS Feed base schema
const rssFeedSchema = Joi.object({
    Provider: Joi.string()
        .required()
        .max(100)
        .trim()
        .messages({
            'string.empty': 'Provider is required',
            'string.max': 'Provider must not exceed 100 characters',
            'any.required': 'Provider is required'
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
        }),
    rssLink: Joi.string()
        .required()
        .uri()
        .trim()
        .messages({
            'string.empty': 'RSS Link is required',
            'string.uri': 'RSS Link must be a valid URL',
            'any.required': 'RSS Link is required'
        }),
    isActive: Joi.boolean()
        .default(true)
});

// Create RSS Feed validation schema
const createRssFeedSchema = rssFeedSchema;

// Update RSS Feed validation schema
const updateRssFeedSchema = Joi.object({
    Provider: Joi.string()
        .trim()
        .max(100)
        .messages({
            'string.max': 'Provider must not exceed 100 characters'
        }),
    subtype: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .messages({
            'string.min': 'Subtype must be at least 2 characters long',
            'string.max': 'Subtype must not exceed 50 characters'
        }),
    rssLink: Joi.string()
        .uri()
        .trim()
        .messages({
            'string.uri': 'RSS Link must be a valid URL'
        }),
    isActive: Joi.boolean(),
}).min(1); // At least one field required for update

// ID validation schema
const idSchema = Joi.string()
    .required()
    .custom(objectIdValidation)
    .messages({
        'string.empty': 'ID is required',
        'any.required': 'ID is required',
        'any.invalid': 'Invalid ID format'
    });

export {
    createRssFeedSchema,
    updateRssFeedSchema,
    idSchema
}; 