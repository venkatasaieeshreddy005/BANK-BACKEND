const mongoose = require("mongoose");
const ledgerModel=require("./ledger");

const accountSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Account must be associated with user"],
            index: true,
        },
        accountType: {
            type: String,
            enum: {
                values: ["SAVINGS", "CURRENT", "SALARY", "BUSINESS"],
                message: "Invalid account type",
            },
            
            required: [true, "Account type is required"],
        },

        balance: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },



        status: {
            type: String,
            enum: {
                values: ["ACTIVE", "FROZEN", "CLOSED"],
                message: "Status can be either active, frozen or closed",
            },
            default: "ACTIVE",
        },

        currency: {
            type: String,
            required: [true, "Currency is required for creating an account"],
            default: "INR",
        },
        
    },
    {
        timestamps: true,
    }
);

accountSchema.index({ user: 1, status: 1 });

accountSchema.methods.getLedgerBalance = async function () {
  const balanceData = await ledgerModel.aggregate([
    {
      $match: {
        account: this._id,
      },
    },

    {
      $group: {
        _id: null,

        totalDebit: {
          $sum: {
            $cond: [
              { $eq: ["$type", "DEBIT"] },
              "$amount",
              0,
            ],
          },
        },

        totalCredit: {
          $sum: {
            $cond: [
              { $eq: ["$type", "CREDIT"] },
              "$amount",
              0,
            ],
          },
        },
      },
    },

    {
      $project: {
        _id: 0,

        balance: {
          $subtract: ["$totalCredit", "$totalDebit"],
        },
      },
    },
  ]);

  if (balanceData.length === 0) {
    return 0;
  }

  return balanceData[0].balance;
};

const accountModel = mongoose.model("account", accountSchema);

module.exports = accountModel;
