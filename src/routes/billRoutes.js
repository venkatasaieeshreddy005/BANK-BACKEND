const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth.js");


const {
  listMyBills,
  payBill,
} = require("../controller/billController");

router.use(authMiddleware);

router.get("/", listMyBills);
router.post("/:id/pay", payBill);

module.exports = router;
