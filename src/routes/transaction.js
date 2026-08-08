const express=require('express');
const router=express.Router();
const {authMiddleware,authSystemMiddleware}=require("../middleware/auth");
const {createTransaction,createInitialFundsTransaction}=require("../controller/transaction")


router.post("/send",authMiddleware,createTransaction);

router.post("/system/initial-funds",authSystemMiddleware,createInitialFundsTransaction)


module.exports=router;