import Joi from 'joi';

interface RegisterInput {
    name: string;
    email: string;
    password: string;
}

interface LoginInput {
    email: string;
    password: string;
}

const registerSchema = Joi.object<RegisterInput>({
    name: Joi.string()
        .required()
        .min(2)
        .max(50)
        .trim()
        .messages({
            'string.empty': 'Name is required',
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name must not exceed 50 characters',
            'any.required': 'Name is required'
        }),
    email: Joi.string()
        .email()
        .required()
        .trim()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
    password: Joi.string()
        .required()
        .min(6)
        .max(30)
        .messages({
            'string.empty': 'Password is required',
            'string.min': 'Password must be at least 6 characters long',
            'string.max': 'Password must not exceed 30 characters',
            'any.required': 'Password is required'
        })
});

const loginSchema = Joi.object<LoginInput>({
    email: Joi.string()
        .email()
        .required()
        .trim()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
    password: Joi.string()
        .required()
        .messages({
            'string.empty': 'Password is required',
            'any.required': 'Password is required'
        })
});

export {
    registerSchema,
    loginSchema,
    type RegisterInput,
    type LoginInput
}; 