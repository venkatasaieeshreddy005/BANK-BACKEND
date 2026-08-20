const mongoose = require("mongoose");

const Bill = require("../models/billModel");
const Account = require('../models/account');

const { moveFunds } = require("../services/escrowTransfer");
const { paySplitShareCore } = require("./splitBillController");

// GET /api/bills
module.exports.listMyBills = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query; // optional ?status=UNPAID

    const filter = {
      user: userId,
    };

    if (status) {
      filter.status = status;
    }

    const bills = await Bill.find(filter).sort({
      createdAt: -1,
    });

    return res.json({
      bills,
    });
  } catch (err) {
    console.error("listMyBills error:", err);

    return res.status(500).json({
      message: "Failed to list bills",
    });
  }
};

// POST /api/bills/:id/pay
module.exports.payBill = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const bill = await Bill.findOne({
      _id: id,
      user: userId,
    });

    if (!bill) {
      return res.status(404).json({
        message: "Bill not found",
      });
    }

    if (bill.status === "PAID") {
      return res.json({
        message: "Already paid",
        bill,
      });
    }

    if (bill.status === "CANCELLED") {
      return res.status(409).json({
        message: "This bill was cancelled",
      });
    }

    // Mirrored split-bill share uses the escrow flow.
    // This keeps split payments and refunds in one place.
    if (bill.sourceSplitBill) {
      const result = await paySplitShareCore({
        splitBillId: bill.sourceSplitBill,
        userId,
      });

      const refreshedBill = await Bill.findById(bill._id);

      return res.json({
        message: result.settled
          ? "Payment successful — split bill fully settled"
          : result.alreadyPaid
          ? "Already paid"
          : "Payment successful — waiting on other participants",

        bill: refreshedBill,
      });
    }

    // Plain bill: pay the payer's account directly to the receiver.
    const session = await mongoose.startSession();

    try {
      let transaction;

      await session.withTransaction(async () => {
        const payerAccount = await Account.findOne({
          user: userId,
        }).session(session);

        if (!payerAccount) {
          throw new Error("No account found for this user");
        }

        // Existing account system stores money as whole rupees.
        const amount = bill.amount;

        if (!Number.isInteger(amount) || amount < 1) {
          throw new Error("Bill amount must be a whole rupee amount of at least ₹1");
        }

        transaction = await moveFunds({
          session,
          fromAccountId: payerAccount._id,
          toAccountId: bill.receiverAccount,
          amount,
          idempotencyKey: `bill-pay:${bill._id}`,
          type: "BILL_PAYMENT",
        });

        bill.status = "PAID";
        bill.transaction = transaction._id;

        await bill.save({
          session,
        });
      });

      return res.json({
        message: "Payment successful",
        bill,
      });
    } finally {
      await session.endSession();
    }
  } catch (err) {
    const status =
      err.statusCode ||
      (err.name === "InsufficientFundsError" ? 402 : 500);

    if (status === 500) {
      console.error("payBill error:", err);
    }

    return res.status(status).json({
      message: err.message || "Payment failed",
    });
  }
};
