const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth.js");

const {
  createSplitBill,
  paySplitShare,
  getSplitBill,
  listMySplitBills,
} = require("../controller/splitBillController");

router.use(authMiddleware);

router.post("/", createSplitBill);
router.get("/", listMySplitBills);
router.get("/:id", getSplitBill);
router.post("/:id/pay", paySplitShare);

module.exports = router;
