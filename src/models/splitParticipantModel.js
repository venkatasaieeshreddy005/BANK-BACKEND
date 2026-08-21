const mongoose = require("mongoose");
const { Schema } = mongoose;

const splitParticipantSchema = new Schema(
  {
    splitBill: {
      type: Schema.Types.ObjectId,
      ref: "SplitBill",
      required: true,
      index: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    share: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID", "REFUNDED"],
      default: "PENDING",
      index: true,
    },

    payerAccount: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    transaction: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },

    refundTransaction: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

splitParticipantSchema.index(
  { splitBill: 1, user: 1 },
  { unique: true }
);

module.exports = mongoose.model("SplitParticipant", splitParticipantSchema);