const userModel = require("../models/user");
const jwt = require("jsonwebtoken");
const tokenBlacklistModel = require("../models/blacklist");
const generateOtp = require("../services/generateOtp");
const crypto = require("crypto");


module.exports.authMiddleware = async (req, res, next) => {
    const token =
        req.cookies?.token ||
        req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized: access token is missing",
        });
    }

    const isBlacklisted = await tokenBlacklistModel.findOne({ token });
    if (isBlacklisted) {
        return res.status(401).json({ 
            message: "Unauthorized token invalid"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await userModel.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized: user not found",
            });
        }

        req.user = user;
        return next();

    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized: access token is invalid",
        });
    }
};

module.exports.authSystemMiddleware = async (req, res, next) => {
    const token =
        req.cookies?.token ||
        req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized: access token is missing",
        });
    }

    const isBlacklisted = await tokenBlacklistModel.findOne({ token });
    if (isBlacklisted) {
        return res.status(401).json({ 
            message: "Unauthorized token invalid"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await userModel.findById(decoded.userId).select("+systemUser");
        
        // Added check for non-existent user before checking .systemUser
        if (!user || !user.systemUser) {
            return res.status(403).json({
                message: "Forbidden access, not a system user",
            });
        }

        req.user = user;
        return next();

    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized: access token is invalid",
        });
    }
};

module.exports.sendOtpMiddleware = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

       
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        
        const otp = generateOtp();

        const otpHash = crypto
            .createHash("sha256")
            .update(String(otp))
            .digest("hex");

        res.cookie("otp", otpHash, {
            signed: true,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 5 * 60 * 1000,
            sameSite: "strict"
        });

        res.cookie("resetEmail", email, {
            signed: true,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 5 * 60 * 1000
        });

        req.otp = otp;


        return next();

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};