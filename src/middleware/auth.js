const userModel = require("../models/user");
const jwt = require("jsonwebtoken");
const tokenBlacklistModel = require("../models/blacklist");

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
        return res.status(401).json({ // Fixed typo: res.sstatus -> res.status
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
        return res.status(401).json({ // Fixed typo: res.sstatus -> res.status
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