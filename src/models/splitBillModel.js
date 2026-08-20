const mongoose = require("mongoose");
const { Schema } = mongoose;

const splitBillSchema = new Schema(
  {
    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    receiverAccount: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    description: {
      type: String,
      trim: true,
    },

    splitType: {
      type: String,
      enum: ["EQUAL", "CUSTOM"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "AWAITING_PAYMENTS",
        "SETTLING",
        "SETTLED",
        "CANCELLED",
      ],
      default: "AWAITING_PAYMENTS",
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    settledTransaction: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SplitBill", splitBillSchema);
