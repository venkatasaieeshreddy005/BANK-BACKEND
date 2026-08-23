const Account = require("../models/account");
const User = require("../models/user");
const Transaction = require("../models/transaction");
const Ledger = require("../models/ledger");

class InsufficientFundsError extends Error {
    constructor(message = "Insufficient funds") {
        super(message);
        this.name = "InsufficientFundsError";
        this.statusCode = 402;
    }
}

class IdempotencyConflictError extends Error {
    constructor(
        message = "Idempotency key already used for a different transaction"
    ) {
        super(message);
        this.name = "IdempotencyConflictError";
        this.statusCode = 409;
    }
}



async function getSystemAccountId(session) {
    //  System account lookup must happen inside the transaction.
     

    if (!session) {
        throw new Error(
            "getSystemAccountId requires an active mongoose session"
        );
    }

    
    //   Find the system user.
     

    const userQuery = User.findOne({
        systemUser: true
    }).select("_id");

    userQuery.session(session);

    const systemUser = await userQuery;

    if (!systemUser) {
        throw new Error(
            "System user not found. Create a user with systemUser: true."
        );
    }

   
    //  Find the account belonging to the system user.
  

    const accountQuery = Account.findOne({
        user: systemUser._id
    }).select("_id status");

    accountQuery.session(session);

    const systemAccount = await accountQuery;

    if (!systemAccount) {
        throw new Error(
            "System user does not have a linked account."
        );
    }

    if (systemAccount.status !== "ACTIVE") {
        throw new Error(
            "System / escrow account is not ACTIVE."
        );
    }

    return systemAccount._id;
}



async function moveFunds({
    session,
    fromAccountId,
    toAccountId,
    amount,
    idempotencyKey,
    type
}) {

    // 1. Validate session

    if (!session) {
        throw new Error(
            "moveFunds requires an active mongoose session"
        );
    }

    //  2. Validate required fields

    if (!fromAccountId) {
        throw new Error("fromAccountId is required");
    }

    if (!toAccountId) {
        throw new Error("toAccountId is required");
    }

    if (!idempotencyKey) {
        throw new Error("idempotencyKey is required");
    }

    if (!type) {
        throw new Error("type is required");
    }

    // 3. Validate amount

    if (
        typeof amount !== "number" ||
        !Number.isFinite(amount)
    ) {
        throw new Error(
            "amount must be a valid number"
        );
    }

    if (amount <= 0) {
        throw new Error(
            "amount must be greater than zero"
        );
    }

    // 4. Convert to nearest INTEGER RUPEE

    const amountRupees = Math.round(amount);

    if (amountRupees <= 0) {
        throw new Error(
            "amount must round to at least ₹1"
        );
    }

    // 5. Prevent same-account transfer

    if (
        String(fromAccountId) === String(toAccountId)
    ) {
        throw new Error(
            "fromAccountId and toAccountId must be different"
        );
    }

    // 6. Idempotency check
    const existingTransaction =
        await Transaction.findOne({
            idempotencyKey
        }).session(session);

    if (existingTransaction) {

        //  The same idempotency key must represent the same operation.
         

        const sameTransaction =
            String(existingTransaction.fromAccount) ===
                String(fromAccountId) &&

            String(existingTransaction.toAccount) ===
                String(toAccountId) &&

            Number(existingTransaction.amount) ===
                amountRupees;

        if (!sameTransaction) {
            throw new IdempotencyConflictError();
        }

        

        return existingTransaction;
    }

//    7. Find source account

    const fromAccount =
        await Account.findOne({
            _id: fromAccountId
        }).session(session);

    if (!fromAccount) {
        throw new Error(
            "Source account not found"
        );
    }

    //  8. Find destination account

    const toAccount =
        await Account.findOne({
            _id: toAccountId
        }).session(session);

    if (!toAccount) {
        throw new Error(
            "Destination account not found"
        );
    }

    // 9. Check account status

    if (fromAccount.status !== "ACTIVE") {
        throw new Error(
            "Source account is not active"
        );
    }

    if (toAccount.status !== "ACTIVE") {
        throw new Error(
            "Destination account is not active"
        );
    }

    // 10. Check balance

    if (fromAccount.balance < amountRupees) {
        throw new InsufficientFundsError();
    }

//    11. Create transaction

    const [transaction] =
        await Transaction.insertMany(
            [
                {
                    fromAccount: fromAccount._id,
                    toAccount: toAccount._id,

                    // Existing database uses integer rupees.
                    amount: amountRupees,

                    status: "COMPLETED",

                    idempotencyKey,

                    // Adapt new feature `type` to existing schema.
                    description: type
                }
            ],
            {
                session
            }
        );

    // 12. Create ledger entries

    await Ledger.insertMany(
        [
            {
                account: fromAccount._id,
                transaction: transaction._id,
                type: "DEBIT",
                amount: amountRupees
            },
            {
                account: toAccount._id,
                transaction: transaction._id,
                type: "CREDIT",
                amount: amountRupees
            }
        ],
        {
            session
        }
    );

    // 13. Debit source account

    const debitResult =
        await Account.updateOne(
            {
                _id: fromAccount._id,
                status: "ACTIVE",
                balance: {
                    $gte: amountRupees
                }
            },
            {
                $inc: {
                    balance: -amountRupees
                }
            },
            {
                session
            }
        );

    if (debitResult.modifiedCount !== 1) {
        throw new InsufficientFundsError(
            "Insufficient funds or source account is no longer available"
        );
    }

    // 14. Credit destination account

    const creditResult =
        await Account.updateOne(
            {
                _id: toAccount._id,
                status: "ACTIVE"
            },
            {
                $inc: {
                    balance: amountRupees
                }
            },
            {
                session
            }
        );

    if (creditResult.modifiedCount !== 1) {
        throw new Error(
            "Failed to credit destination account"
        );
    }

    return transaction;
}

module.exports = {
    moveFunds,
    getSystemAccountId,
    InsufficientFundsError,
    IdempotencyConflictError
};