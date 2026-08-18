const Joi = require("joi");

const registerSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .required(),

    email: Joi.string()
        .trim()
        .email()
        .required(),

    password: Joi.string()
        .min(6)
        .max(20)
        .required()
});


const loginSchema = Joi.object({
    email: Joi.string()
        .trim()
        .email()
        .required(),

    password: Joi.string()
        .min(6)
        .max(20)
        .required()
});


const sendOtpSchema = Joi.object({
    email: Joi.string()
        .trim()
        .email()
        .required()
});


const resetPasswordSchema = Joi.object({
    otp: Joi.string()
        .length(6)
        .pattern(/^[0-9]+$/)
        .required(),

    password: Joi.string()
        .min(8)
        .max(100)
        .required()
});


module.exports = {
    registerSchema,
    loginSchema,
    sendOtpSchema,
    resetPasswordSchema
};
