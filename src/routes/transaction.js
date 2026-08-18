const express=require('express');
const router=express.Router();
const {authMiddleware,authSystemMiddleware}=require("../middleware/auth");
const {createTransaction,createInitialFundsTransaction,showAllTransactions}=require("../controller/transaction")


router.post("/send",authMiddleware,createTransaction);

router.post("/system/initial-funds",authSystemMiddleware,createInitialFundsTransaction);
router.get("/history", authMiddleware, showAllTransactions);


module.exports=router;