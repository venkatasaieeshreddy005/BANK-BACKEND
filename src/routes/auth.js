const express=require('express');
const router=express.Router();
const {registerUser,loginController,logoutController,sendOtpController,resetPassword,getCurrentUser}=require("../controller/auth");
const {authMiddleware,sendOtpMiddleware}=require("../middleware/auth");
const {otpRequestLimiter,otpVerifyLimiter} = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const {registerSchema,loginSchema,sendOtpSchema,resetPasswordSchema} = require("../validators/authValidator");


router.post("/register",validate(registerSchema),registerUser);

router.post("/login",validate(loginSchema),loginController);

router.post("/logout",authMiddleware,logoutController);

router.post("/send-otp",validate(sendOtpSchema),otpRequestLimiter,sendOtpMiddleware,sendOtpController);

router.post("/reset",validate(resetPasswordSchema),otpVerifyLimiter,resetPassword);
router.get("/me", authMiddleware, getCurrentUser);

module.exports=router;