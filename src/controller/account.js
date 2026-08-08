const accountModel = require("../models/account");

module.exports.createAccountController = async (req, res) => {
    try {
        const user = req.user;

        const account = await accountModel.create({
            user: user._id,
            accountType:req.body.accountType,
            currency: req.body.currency || "INR",
        });

        return res.status(201).json({
            account,
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to create account",
            error: error.message,
        });
    }
};

module.exports.getUserAccount=async (req,res)=>{
    const accounts=await accountModel.find({user:req.user._id});

    res.status(200).json({
        accounts
    })
};

module.exports.getAccountBalance=async (req,res)=>{
    const {accountId}=req.params;

    const account =await accountModel.findOne({
        _id:accountId,
        user:req.user._id,
    });

    if (!account) {
        return res.status(404).json({
            message: "Account not found"
        });
    }

    const balance=account.balance;
    res.status(200).json({
        accountId: account._id,
        balance: balance
    });
};
