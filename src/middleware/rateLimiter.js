const rateLimit = require("express-rate-limit");

const otpRequestLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 15 minutes
    max: 3,                   // only 3 OTP requests
    message: {
        message: "Too many OTP requests. Try again later after 10 minutes.",
        status: "failed"
    },
    standardHeaders: true,
    legacyHeaders: false
});

const otpVerifyLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 10 minutes
    max: 3,                   // only 5 OTP attempts
    message: {
        message: "Too many OTP attempts. Try again later after 5 minutes.",
        status: "failed"
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    otpRequestLimiter,
    otpVerifyLimiter
};
