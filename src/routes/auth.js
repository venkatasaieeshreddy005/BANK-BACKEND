const express=require('express');
const router=express.Router();
const {registerUser,loginController}=require("../controller/auth");



router.post("/register",registerUser);

router.post("/login",loginController);

module.exports=router;