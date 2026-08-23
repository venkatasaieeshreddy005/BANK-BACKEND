const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const {
  createAccountController,
  getUserAccount,
  getAccountBalance,
} = require("../controller/account");

router.post("/create", authMiddleware, createAccountController);
router.get("/", authMiddleware, getUserAccount);
router.get("/:accountId/balance", authMiddleware, getAccountBalance);

module.exports = router;