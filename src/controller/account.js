const accountModel = require("../models/account");

module.exports.createAccountController = async (req, res) => {
  try {
    const user = req.user;
    const { accountType, currency } = req.body;

    const allowedTypes = ["SAVINGS", "CURRENT", "BUSINESS"];
    const selectedType = (accountType || "SAVINGS").toUpperCase();

    if (!allowedTypes.includes(selectedType)) {
      return res.status(400).json({
        message: "Invalid account type. Choose SAVINGS, CURRENT, or BUSINESS.",
      });
    }

    // Check if an account of this type already exists for the user
    const existingAccount = await accountModel.findOne({
      user: user._id,
      accountType: selectedType,
    });

    if (existingAccount) {
      return res.status(400).json({
        message: `You already have an active ${selectedType} account. Only one account of each type is allowed.`,
      });
    }

    //Balance strictly defaults to 0
    const account = await accountModel.create({
      user: user._id,
      accountType: selectedType,
      currency: currency || "INR",
      balance: 0,
      status: "ACTIVE",
    });

    return res.status(201).json({
      success: true,
      account,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create account",
      error: error.message,
    });
  }
};

module.exports.getUserAccount = async (req, res) => {
  try {
    const accounts = await accountModel.find({ user: req.user._id });
    res.status(200).json({ accounts });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch accounts",
      error: error.message,
    });
  }
};

module.exports.getAccountBalance = async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await accountModel.findOne({
      _id: accountId,
      user: req.user._id,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.status(200).json({
      accountId: account._id,
      balance: account.balance,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch balance",
      error: error.message,
    });
  }
};