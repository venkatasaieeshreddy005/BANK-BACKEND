const mongoose = require("mongoose");
const transactionModel = require("../models/transaction");
const ledgerModel = require("../models/ledger");
const accountModel = require("../models/account");
const userModel = require("../models/user");
const { sendTransactionEmail } = require("../services/email");

module.exports.createTransaction = async (req, res) => {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body || {};

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount, toAccount, amount, and idempotencyKey are required"
        });
    }

    if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than zero" });
    }

    const session = await mongoose.startSession();
    let transaction;

    try {
        session.startTransaction();

        // 1. Fetch accounts INSIDE the transaction session
        const fromUserAccount = await accountModel.findOne({
            _id: fromAccount,
            user: req.user._id
        }).session(session);

        if (!fromUserAccount) {
            await session.abortTransaction();
            return res.status(400).json({ message: "User account does not exist or unauthorized" });
        }

        const toUserAccount = await accountModel.findOne({ _id: toAccount }).session(session);
        if (!toUserAccount) {
            await session.abortTransaction();
            return res.status(400).json({ message: "Recipient account does not exist" });
        }

        if (fromUserAccount._id.equals(toUserAccount._id)) {
            await session.abortTransaction();
            return res.status(400).json({ message: "Cannot transfer funds to the same account" });
        }

        // 2. Validate Idempotency 
        const isTransactionAlreadyExists = await transactionModel.findOne({ idempotencyKey }).session(session);
        if (isTransactionAlreadyExists) {
            await session.abortTransaction();

            const sameTransaction = isTransactionAlreadyExists.fromAccount.equals(fromUserAccount._id) &&
                                    isTransactionAlreadyExists.toAccount.equals(toUserAccount._id) &&
                                    isTransactionAlreadyExists.amount === amount;

            if (!sameTransaction) {
                return res.status(409).json({
                    message: "Idempotency key already used for a different transaction"
                });
            }

            return res.status(200).json({
                message: `Transaction already processed with status: ${isTransactionAlreadyExists.status}`,
                transaction: isTransactionAlreadyExists
            });
        }

        // 3. Status and Balance Validations
        if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
            await session.abortTransaction();
            return res.status(400).json({ message: "Both accounts must be ACTIVE to proceed" });
        }

        if (fromUserAccount.balance < amount) {
            await session.abortTransaction();
            return res.status(400).json({ message: "Insufficient funds" });
        }

        // 4. Create Pending Transaction Document
        transaction = new transactionModel({
            fromAccount: fromUserAccount._id,
            toAccount: toUserAccount._id,
            amount,
            idempotencyKey,
            status: "PENDING"
        });
        await transaction.save({ session });

        // 5. Create Ledger Entries using insertMany 
        await ledgerModel.insertMany([
            {
                account: fromUserAccount._id,
                amount: amount,
                transaction: transaction._id,
                type: "DEBIT"
            },
            {
                account: toUserAccount._id,
                amount: amount,
                transaction: transaction._id,
                type: "CREDIT"
            }
        ], { session });

        // 6. Atomic Balance Updates 
        await accountModel.updateOne(
            { _id: fromUserAccount._id },
            { $inc: { balance: -amount } },
            { session }
        );

        await accountModel.updateOne(
            { _id: toUserAccount._id },
            { $inc: { balance: amount } },
            { session }
        );

        // 7. Mark as COMPLETED
        transaction.status = "COMPLETED";
        await transaction.save({ session });

        await session.commitTransaction();

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error("DB Transaction Failed:", error);

        return res.status(500).json({
            message: "Transaction failed",
            error: error.message
        });
    } finally {
        await session.endSession();
    }

    // 8. Send Notification Email 
    try {
        await sendTransactionEmail(req.user.email, req.user.name, amount, toAccount);
    } catch (emailError) {
        console.error("Failed to send transaction notification email:", emailError);
    }

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction
    });
};

module.exports.createInitialFundsTransaction = async (req, res) => {
    const { toAccount, amount, idempotencyKey } = req.body || {};

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount, and idempotencyKey are required"
        });
    }

    if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than zero" });
    }

    const session = await mongoose.startSession();
    let transaction;

    try {
        session.startTransaction();

        // 1. Fetch system user & accounts INSIDE session
        const systemUser = await userModel.findOne({ systemUser: true }).session(session);
        if (!systemUser) {
            await session.abortTransaction();
            return res.status(400).json({ message: "SystemUser does not exist" });
        }

        const fromUserAccount = await accountModel.findOne({ user: systemUser._id }).session(session);
        if (!fromUserAccount) {
            await session.abortTransaction();
            return res.status(400).json({ message: "SystemUser account does not exist" });
        }

        const toUserAccount = await accountModel.findOne({ _id: toAccount }).session(session);
        if (!toUserAccount) {
            await session.abortTransaction();
            return res.status(400).json({ message: "Target account does not exist" });
        }

        // 2. Validate Idempotency 
        const isTransactionAlreadyExists = await transactionModel.findOne({ idempotencyKey }).session(session);
        if (isTransactionAlreadyExists) {
            await session.abortTransaction();

            const sameTransaction = isTransactionAlreadyExists.fromAccount.equals(fromUserAccount._id) &&
                                    isTransactionAlreadyExists.toAccount.equals(toUserAccount._id) &&
                                    isTransactionAlreadyExists.amount === amount;

            if (!sameTransaction) {
                return res.status(409).json({
                    message: "Idempotency key already used for a different transaction"
                });
            }

            return res.status(200).json({
                message: `Transaction already processed with status: ${isTransactionAlreadyExists.status}`,
                transaction: isTransactionAlreadyExists
            });
        }

        // 3. Create Pending Transaction Document
        transaction = new transactionModel({
            fromAccount: fromUserAccount._id,
            toAccount: toUserAccount._id,
            amount,
            idempotencyKey,
            status: "PENDING"
        });
        await transaction.save({ session });

        // 4. Create Ledger Entries using insertMany 
        await ledgerModel.insertMany([
            {
                account: fromUserAccount._id,
                amount: amount,
                transaction: transaction._id,
                type: "DEBIT"
            },
            {
                account: toUserAccount._id,
                amount: amount,
                transaction: transaction._id,
                type: "CREDIT"
            }
        ], { session });

        // 5. Atomic Balance Updates 
        await accountModel.updateOne(
            { _id: fromUserAccount._id },
            { $inc: { balance: -amount } },
            { session }
        );

        await accountModel.updateOne(
            { _id: toUserAccount._id },
            { $inc: { balance: amount } },
            { session }
        );

        transaction.status = "COMPLETED";
        await transaction.save({ session });

        await session.commitTransaction();

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        console.error("Initial funds transaction failed:", error);

        return res.status(500).json({
            message: "Transaction failed",
            error: error.message
        });

    } finally {
        await session.endSession();
    }

    // 6. Send Notification Email
    try {
        if (req.user && req.user.email) {
            await sendTransactionEmail(req.user.email, req.user.name, amount, toAccount);
        }
    } catch (emailError) {
        console.error("Failed to send transaction email:", emailError);
    }

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction
    });
};