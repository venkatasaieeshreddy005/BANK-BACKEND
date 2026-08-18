const userModel = require("../models/user");
const jwt = require("jsonwebtoken");
const { sendEmail, sendRegistrationEmail } = require("../services/email");
const tokenBlacklistModel = require("../models/blacklist");
const crypto = require("crypto");


module.exports.registerUser = async (req, res) => {
    try {
        const { email, name, password } = req.body;

        const isExists = await userModel.findOne({ email });

        if (isExists) {
            return res.status(400).json({
                message: "User already exists with this email",
                status: "failed"
            });
        }

        const user = new userModel({
            name,
            email,
            password
        });

        await user.save(); // password gets hashed automatically

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "2d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 2 * 24 * 60 * 60 * 1000
        });



        res.status(201).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            token
        });

        sendRegistrationEmail(user.email, user.name);

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

module.exports.loginController = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userModel
            .findOne({ email })
            .select("+password");

        if (!user) {
            return res.status(400).json({
                message: "No User Exists",
                status: "failed"
            });
        }

        const isvalidPassword = await user.comparePassword(password);

        if (!isvalidPassword) {
            return res.status(400).json({
                message: "Incorrect password",
                status: "failed"
            });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "2d" });

       res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 2 * 24 * 60 * 60 * 1000
        });

        // remove the token from sending the response when connected with frontend

        res.status(200).json({
            message: "Login Successful",
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            token
            
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

module.exports.logoutController = async (req, res) => {
    try {
        const token =
            req.cookies?.token ||
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(200).json({
                message: "User logged out successfully"
            });
        }

        // Fixed variable casing here:
        await tokenBlacklistModel.create({
            token: token
        });

        res.clearCookie("token");

        return res.status(200).json({
            message: "User logged out successfully"
        });

    } catch (error) {
        // Token is already blacklisted
        if (error.code === 11000) {
            res.clearCookie("token");

            return res.status(200).json({
                message: "User logged out successfully"
            });
        }

        console.error("Logout error:", error);

        return res.status(500).json({
            message: "Logout failed"
        });
    }
};

module.exports.sendOtpController = async (req, res) => {
    try {
        const { email } = req.body;

        
        const otp = req.otp;

        console.log("OTP:", otp);

        await sendEmail(
            email,
            "Password Reset OTP",
            `Your password reset OTP is ${otp}. It expires in 5 minutes.`
        );

        return res.status(200).json({
            message: "OTP sent successfully",
            status: "success"
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: error.message,
            status: "failed"
        });
    }
};




module.exports.resetPassword = async (req, res) => {
    try {
        const { otp, password } = req.body;

        const originalOtpHash = req.signedCookies.otp;
        const email = req.signedCookies.resetEmail;

        if (!originalOtpHash || !email) {
            return res.status(400).json({
                message: "OTP expired or not found",
                status: "failed"
            });
        }

        const submittedOtpHash = crypto
            .createHash("sha256")
            .update(String(otp))
            .digest("hex");

        if (submittedOtpHash !== originalOtpHash) {
            return res.status(400).json({
                message: "Invalid OTP",
                status: "failed"
            });
        }

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                status: "failed"
            });
        }

        user.password = password;

        await user.save();

        // OTP and reset identity cannot be reused
        res.clearCookie("otp");
        res.clearCookie("resetEmail");

        return res.status(200).json({
            message: "Password reset successfully",
            status: "success"
        });

    } catch (error) {
        console.error("Reset password error:", error);

        return res.status(500).json({
            message: "Internal server error",
            status: "failed"
        });
    }
};

module.exports.getCurrentUser = async (req, res) => {
    try {
        return res.status(200).json({
            user: {
                _id: req.user._id,
                email: req.user.email,
                name: req.user.name
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to get current user"
        });
    }
};


