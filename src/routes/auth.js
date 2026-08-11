const express=require('express');
const router=express.Router();
const {registerUser,loginController,logoutController,sendOtpController,resetPassword}=require("../controller/auth");
const {authMiddleware,sendOtpMiddleware}=require("../middleware/auth");


router.post("/register",registerUser);

router.post("/login",loginController);

router.post("/logout",authMiddleware,logoutController);
router.post(
    "/send-otp",
    authMiddleware,
    sendOtpMiddleware,
    sendOtpController
);

router.post(
    "/reset",
    authMiddleware,
    resetPassword
);

module.exports=router;