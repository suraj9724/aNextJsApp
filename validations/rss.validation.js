const Joi = require('joi');

// RSS Feed base schema
const rssFeedSchema = Joi.object({
    Provider: Joi.string()
        .required()
        .max(100)
        .messages({
            'string.empty': 'Provider is required',
            'string.max': 'Provider must not exceed 100 characters'
        }),
    subtype: Joi.string()
        .required()
        .messages({
            'string.empty': 'Subtype is required'
        }),
    rssLink: Joi.string()
        .required()
        .uri()
        .messages({
            'string.empty': 'RSS Link is required',
            'string.uri': 'RSS Link must be a valid URL'
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
    subtype: Joi.string(),
    rssLink: Joi.string()
        .uri()
        .messages({
            'string.uri': 'RSS Link must be a valid URL'
        }),
    isActive: Joi.boolean(),
}).min(1); // At least one field required for update

// ID validation schema
const idSchema = Joi.string()
    .required()
    .messages({
        'string.empty': 'ID is required',
        'any.required': 'ID is required'
    });

module.exports = {
    createRssFeedSchema,
    updateRssFeedSchema,
    idSchema
}; 