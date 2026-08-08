const express=require('express');
const router=express.Router();
const {registerUser,loginController,logoutController}=require("../controller/auth");



router.post("/register",registerUser);

router.post("/login",loginController);

router.post("/logout",logoutController);

module.exports=router;