"use strict";
const Joi = require('joi');
const newsSchema = Joi.object({
    title: Joi.string().required().messages({
        'string.empty': 'Title is required'
    }),
    content: Joi.string().required().messages({
        'string.empty': 'Content is required'
    }),
    url: Joi.string().uri().required().messages({
        'string.empty': 'URL is required',
        'string.uri': 'URL must be valid'
    }),
    publishedAt: Joi.date().required().messages({
        'date.base': 'Published date is required'
    }),
    author: Joi.string(),
    source: Joi.string().required().messages({
        'string.empty': 'RSS Feed ID is required'
    }),
    subtype: Joi.string().required().messages({
        'string.empty': 'Subtype is required'
    })
});
module.exports = {
    newsSchema
};
