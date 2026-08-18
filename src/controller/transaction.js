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

module.exports.showAllTransactions = async (req, res) => {
    try {
        const userId = req.user._id;

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;

        // Optional: filter to a single account via ?accountId=...
        const { accountId } = req.query;

        // 1. Get all account IDs belonging to this user
        const userAccounts = await accountModel.find({ user: userId }).select("_id accountType");

        if (userAccounts.length === 0) {
            return res.status(200).json({
                transactions: [],
                page,
                totalPages: 0,
                totalTransactions: 0
            });
        }

        let accountIds = userAccounts.map(acc => acc._id);

        // If the user asked for a specific account, narrow to just that one
        // (but still verify it belongs to them)
        if (accountId) {
            const owns = accountIds.some(id => id.toString() === accountId);
            if (!owns) {
                return res.status(403).json({ message: "This account does not belong to you" });
            }
            accountIds = [accountId];
        }

        // 2. Find transactions where ANY of the user's accounts is sender OR receiver
        const filter = {
            $or: [
                { fromAccount: { $in: accountIds } },
                { toAccount: { $in: accountIds } }
            ]
        };

        const [transactions, totalTransactions] = await Promise.all([
            transactionModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("fromAccount", "accountType currency user")
                .populate("toAccount", "accountType currency user"),
            transactionModel.countDocuments(filter)
        ]);

        // 3. Build a set of ALL the user's account IDs (not the possibly-narrowed one)
        //    so we can correctly detect self-transfers between the user's own accounts
        const allUserAccountIds = new Set(userAccounts.map(acc => acc._id.toString()));

        const result = transactions.map(txn => {
            const fromIsMine = allUserAccountIds.has(txn.fromAccount._id.toString());
            const toIsMine = allUserAccountIds.has(txn.toAccount._id.toString());

            let direction;
            if (fromIsMine && toIsMine) {
                direction = "SELF_TRANSFER"; // moved between your own accounts
            } else if (fromIsMine) {
                direction = "SENT";
            } else {
                direction = "RECEIVED";
            }

            return {
                _id: txn._id,
                direction,
                amount: txn.amount,
                status: txn.status,
                // which of the user's own accounts was involved on each side (if any)
                fromAccount: txn.fromAccount,
                toAccount: txn.toAccount,
                createdAt: txn.createdAt
            };
        });

        return res.status(200).json({
            transactions: result,
            page,
            totalPages: Math.ceil(totalTransactions / limit),
            totalTransactions
        });

    } catch (error) {
        console.error("Fetch transactions error:", error);
        return res.status(500).json({
            message: "Failed to fetch transactions"
        });
    }
};