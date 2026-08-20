const mongoose = require("mongoose");
const { Schema } = mongoose;

const billSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    receiverAccount: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    status: {
      type: String,
      enum: ["UNPAID", "PAID", "CANCELLED"],
      default: "UNPAID",
      index: true,
    },

    dueDate: {
      type: Date,
    },

    sourceSplitBill: {
      type: Schema.Types.ObjectId,
      ref: "SplitBill",
      default: null,
    },

    sourceSplitParticipant: {
      type: Schema.Types.ObjectId,
      ref: "SplitParticipant",
      default: null,
    },

    transaction: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
  },
  { timestamps: true }
);

billSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("Bill", billSchema);
