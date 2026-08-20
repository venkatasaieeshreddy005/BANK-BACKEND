const mongoose = require("mongoose");

const SplitBill = require("../models/splitBillModel");
const SplitParticipant = require("../models/splitParticipantModel");
const Bill = require("../models/billModel");
const Friend = require("../models/friendModel");

const Account = require("../models/account");

const {
  moveFunds,
  getSystemAccountId,
} = require("../services/escrowTransfer");

const { sendNotification } = require("../services/notify");

const MAX_FRIENDS_PER_SPLIT = 3;
const SPLIT_EXPIRY_HOURS = 2; // ADAPT if you want a different window

async function getAccountIdForUser(userId, session) {
  const account = await Account.findOne({
    user: userId,
  }).session(session);

  if (!account) {
    throw new Error(`No account found for user ${userId}`);
  }

  return account._id;
}

/**
 * Splits the total amount equally among participants.
 *
 * All money is stored as INTEGER RUPEES.
 *
 * Example:
 * ₹100 split between 3 people:
 *
 * Host  = ₹34
 * Friend = ₹33
 * Friend = ₹33
 *
 * Any leftover rupee goes to the first participant.
 * The host is always first.
 */
function computeEqualShares(totalAmount, participantUserIds) {
  const n = participantUserIds.length;

  const base = Math.floor(totalAmount / n);
  const remainder = totalAmount - base * n;

  return participantUserIds.map((userId, idx) => ({
    userId,
    share: idx === 0 ? base + remainder : base,
  }));
}

// POST /api/split-bills
// body: {
//   receiverAccount,
//   totalAmount,
//   description,
//   splitType: "EQUAL"|"CUSTOM",
//   friendIds: [up to 3 ids],
//   customShares: [{ userId, share }, ...]
// }
module.exports.createSplitBill = async (req, res) => {
  const hostId = req.user._id;

  const {
    receiverAccount,
    totalAmount,
    description,
    splitType,
    friendIds = [],
    customShares,
  } = req.body;

  // ---- Basic input validation ----

  if (!receiverAccount) {
    return res.status(400).json({
      message: "receiverAccount is required",
    });
  }

  /*
   * Money is stored ONLY as whole rupees.
   *
   * Examples:
   * 100  -> ₹100
   * 1    -> ₹1
   *
   * Paise are not accepted.
   */
  if (
    typeof totalAmount !== "number" ||
    !Number.isFinite(totalAmount) ||
    !Number.isInteger(totalAmount) ||
    totalAmount < 1
  ) {
    return res.status(400).json({
      message:
        "totalAmount must be a positive whole number of rupees (minimum ₹1)",
    });
  }

  if (!["EQUAL", "CUSTOM"].includes(splitType)) {
    return res.status(400).json({
      message: "splitType must be EQUAL or CUSTOM",
    });
  }

  if (!Array.isArray(friendIds) || friendIds.length === 0) {
    return res.status(400).json({
      message: "Select at least one friend to split with",
    });
  }

  if (friendIds.length > MAX_FRIENDS_PER_SPLIT) {
    return res.status(400).json({
      message: `You can split with at most ${MAX_FRIENDS_PER_SPLIT} friends`,
    });
  }

  const uniqueFriendIds = [...new Set(friendIds.map(String))];

  if (uniqueFriendIds.length !== friendIds.length) {
    return res.status(400).json({
      message: "Duplicate friends in friendIds",
    });
  }

  if (uniqueFriendIds.includes(String(hostId))) {
    return res.status(400).json({
      message: "Don't include yourself in friendIds",
    });
  }

  // ---- Every selected friend must actually be on the host's friend list ----
  const friendLinks = await Friend.find({
    user: hostId,
    friend: {
      $in: uniqueFriendIds,
    },
  }).select("friend");

  if (friendLinks.length !== uniqueFriendIds.length) {
    return res.status(400).json({
      message: "One or more selected users are not in your friend list",
    });
  }

  // Host is always a participant, listed first.
  const participantUserIds = [
    String(hostId),
    ...uniqueFriendIds,
  ];

  // ---- Compute shares server-side ----
  let shares;

  if (splitType === "EQUAL") {
    shares = computeEqualShares(
      totalAmount,
      participantUserIds
    );
  } else {
    /*
     * CUSTOM split.
     *
     * Expected:
     *
     * customShares: [
     *   { userId: "...", share: 100 },
     *   { userId: "...", share: 200 }
     * ]
     *
     * All shares must be whole rupees.
     */
    if (
      !Array.isArray(customShares) ||
      customShares.length !== participantUserIds.length
    ) {
      return res.status(400).json({
        message:
          "customShares must include exactly one entry per participant (host + friends)",
      });
    }

    /*
     * First validate that every custom share belongs to
     * an actual participant and is a whole rupee amount.
     */
    const shareMap = new Map();

    for (const customShare of customShares) {
      if (!customShare || !customShare.userId) {
        return res.status(400).json({
          message: "Every custom share must contain userId",
        });
      }

      const userId = String(customShare.userId);
      const share = customShare.share;

      if (
        !Number.isInteger(share) ||
        share < 1
      ) {
        return res.status(400).json({
          message:
            "Every custom share must be a positive whole number of rupees",
        });
      }

      if (!participantUserIds.includes(userId)) {
        return res.status(400).json({
          message:
            "customShares contains a user who is not a participant",
        });
      }

      if (shareMap.has(userId)) {
        return res.status(400).json({
          message: "Duplicate participant in customShares",
        });
      }

      shareMap.set(userId, share);
    }

    // Every participant must have exactly one share.
    for (const uid of participantUserIds) {
      if (!shareMap.has(uid)) {
        return res.status(400).json({
          message: `Missing share for participant ${uid}`,
        });
      }
    }

    shares = participantUserIds.map((uid) => ({
      userId: uid,
      share: shareMap.get(uid),
    }));
  }

  // ---- Verify that all shares equal the total amount ----

  const sumShares = shares.reduce(
    (total, share) => total + share.share,
    0
  );

  if (sumShares !== totalAmount) {
    return res.status(400).json({
      message: `Shares must sum exactly to ₹${totalAmount}. Got ₹${sumShares}.`,
    });
  }

  // ---- Create everything atomically ----

  const session = await mongoose.startSession();

  try {
    let createdSplitBill;
    let createdParticipants;

    await session.withTransaction(async () => {
      const [splitBill] = await SplitBill.create(
        [
          {
            host: hostId,
            receiverAccount,
            totalAmount,
            description,
            splitType,
            status: "AWAITING_PAYMENTS",
            expiresAt: new Date(
              Date.now() +
                SPLIT_EXPIRY_HOURS * 60 * 60 * 1000
            ),
          },
        ],
        {
          session,
        }
      );

      // Using insertMany for batch insertions inside sessions
      createdParticipants = await SplitParticipant.insertMany(
        shares.map((share) => ({
          splitBill: splitBill._id,
          user: share.userId,
          share: share.share,
          status: "PENDING",
        })),
        {
          session,
        }
      );

      // Mirror each participant's share into their "My Bills" list.
      await Bill.insertMany(
        createdParticipants.map((participant) => ({
          user: participant.user,
          title: "Split bill",
          description: description || "Split bill",
          amount: participant.share,
          receiverAccount,
          status: "UNPAID",
          sourceSplitBill: splitBill._id,
          sourceSplitParticipant: participant._id,
        })),
        {
          session,
        }
      );

      createdSplitBill = splitBill;
    });

    // Notifications after the transaction commits.
    for (const participant of createdParticipants) {
      if (
        String(participant.user) !== String(hostId)
      ) {
        sendNotification(
          participant.user,
          `You've been added to a split bill for ₹${totalAmount}`,
          {
            splitBillId: createdSplitBill._id,
            share: participant.share,
          }
        );
      }
    }

    return res.status(201).json({
      splitBill: createdSplitBill,
      participants: createdParticipants,
    });
  } catch (err) {
    console.error("createSplitBill error:", err);

    return res.status(500).json({
      message: "Failed to create split bill",
    });
  } finally {
    await session.endSession();
  }
};

/**
 * Core "pay my share" logic.
 *
 * Used by:
 *   1. Split bill payment
 *   2. My Bills payment
 *
 * All amounts are INTEGER RUPEES.
 */
async function paySplitShareCore({
  splitBillId,
  userId,
}) {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const splitBill =
        await SplitBill.findById(
          splitBillId
        ).session(session);

      if (!splitBill) {
        const e = new Error(
          "Split bill not found"
        );

        e.statusCode = 404;
        throw e;
      }

      if (
        splitBill.status !==
        "AWAITING_PAYMENTS"
      ) {
        const e = new Error(
          `Split bill is ${splitBill.status}, cannot pay`
        );

        e.statusCode = 409;
        throw e;
      }

      if (
        splitBill.expiresAt &&
        splitBill.expiresAt < new Date()
      ) {
        const e = new Error(
          "Split bill has expired"
        );

        e.statusCode = 409;
        throw e;
      }

      const participant =
        await SplitParticipant.findOne({
          splitBill: splitBillId,
          user: userId,
        }).session(session);

      if (!participant) {
        const e = new Error(
          "You are not a participant in this split bill"
        );

        e.statusCode = 404;
        throw e;
      }

      if (participant.status === "PAID") {
        // Idempotent: already paid, nothing further to do.
        result = {
          splitBill,
          participant,
          alreadyPaid: true,
          settled: false,
        };

        return;
      }

      const [
        payerAccountId,
        escrowAccountId,
      ] = await Promise.all([
        getAccountIdForUser(
          userId,
          session
        ),
        getSystemAccountId(session),
      ]);

      const amount = participant.share;

      if (
        !Number.isInteger(amount) ||
        amount < 1
      ) {
        throw new Error(
          "Participant share must be a whole rupee amount of at least ₹1"
        );
      }

      const transaction =
        await moveFunds({
          session,
          fromAccountId:
            payerAccountId,
          toAccountId:
            escrowAccountId,
          amount,
          idempotencyKey: `split-share:${participant._id}`,
          type: "SPLIT_BILL_SHARE",
        });

      participant.status = "PAID";
      participant.transaction =
        transaction._id;
      participant.paidAt = new Date();

      await participant.save({
        session,
      });

      await Bill.updateOne(
        {
          sourceSplitParticipant:
            participant._id,
        },
        {
          status: "PAID",
          transaction:
            transaction._id,
        },
        {
          session,
        }
      );

      // Re-derive from paid participants.
      const paidAgg =
        await SplitParticipant.aggregate([
          {
            $match: {
              splitBill:
                splitBill._id,
              status: "PAID",
            },
          },
          {
            $group: {
              _id: null,
              sum: {
                $sum: "$share",
              },
            },
          },
        ]).session(session);

      const paidSoFar =
        paidAgg[0]?.sum || 0;

      let settled = false;

      if (
        paidSoFar ===
        splitBill.totalAmount
      ) {
        const settlementTx =
          await moveFunds({
            session,
            fromAccountId:
              escrowAccountId,
            toAccountId:
              splitBill.receiverAccount,
            amount:
              splitBill.totalAmount,
            idempotencyKey: `split-settle:${splitBill._id}`,
            type: "SPLIT_BILL_SETTLEMENT",
          });

        splitBill.status =
          "SETTLED";

        splitBill.settledTransaction =
          settlementTx._id;

        await splitBill.save({
          session,
        });

        settled = true;
      }

      result = {
        splitBill,
        participant,
        settled,
        alreadyPaid: false,
      };
    });

    // Notifications after commit.
    if (result.settled) {
      const allParticipants =
        await SplitParticipant.find({
          splitBill: splitBillId,
        });

      for (const participant of allParticipants) {
        sendNotification(
          participant.user,
          "Split bill settled — payment sent to receiver.",
          {
            splitBillId,
          }
        );
      }
    } else if (!result.alreadyPaid) {
      sendNotification(
        userId,
        "Your share of the split bill was paid.",
        {
          splitBillId,
        }
      );
    }

    return result;
  } finally {
    await session.endSession();
  }
}

// POST /api/split-bills/:id/pay
module.exports.paySplitShare = async (
  req,
  res
) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const result =
      await paySplitShareCore({
        splitBillId: id,
        userId,
      });

    return res.json({
      message: result.settled
        ? "Payment successful — split bill fully settled"
        : result.alreadyPaid
        ? "Already paid"
        : "Payment successful — waiting on other participants",

      participant:
        result.participant,

      splitBillStatus:
        result.splitBill.status,
    });
  } catch (err) {
    const status =
      err.statusCode ||
      (err.name === "InsufficientFundsError"
        ? 402
        : 500);

    if (status === 500) {
      console.error(
        "paySplitShare error:",
        err
      );
    }

    return res.status(status).json({
      message:
        err.message ||
        "Payment failed",
    });
  }
};

// GET /api/split-bills/:id
module.exports.getSplitBill = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const splitBill =
      await SplitBill.findById(id);

    if (!splitBill) {
      return res.status(404).json({
        message: "Split bill not found",
      });
    }

    const participants =
      await SplitParticipant.find({
        splitBill: id,
      }).populate(
        "user",
        "name email"
      );

    return res.json({
      splitBill,
      participants,
    });
  } catch (err) {
    console.error(
      "getSplitBill error:",
      err
    );

    return res.status(500).json({
      message:
        "Failed to fetch split bill",
    });
  }
};

// GET /api/split-bills
// Bills the current user hosts or participates in.
module.exports.listMySplitBills = async (
  req,
  res
) => {
  try {
    const userId = req.user._id;

    const participantRows =
      await SplitParticipant.find({
        user: userId,
      }).select("splitBill");

    const splitBillIds =
      participantRows.map(
        (participant) =>
          participant.splitBill
      );

    const splitBills =
      await SplitBill.find({
        _id: {
          $in: splitBillIds,
        },
      }).sort({
        createdAt: -1,
      });

    return res.json({
      splitBills,
    });
  } catch (err) {
    console.error(
      "listMySplitBills error:",
      err
    );

    return res.status(500).json({
      message:
        "Failed to list split bills",
    });
  }
};

/**
 * Refund/cancel any split bill whose expiry has passed.
 *
 * Safe to call repeatedly.
 *
 * All refund amounts are INTEGER RUPEES.
 */
module.exports.cancelExpiredSplitBills = async () => {
  const expired =
    await SplitBill.find({
      status:
        "AWAITING_PAYMENTS",
      expiresAt: {
        $lt: new Date(),
      },
    });

  for (const splitBill of expired) {
    const session =
      await mongoose.startSession();

    try {
      await session.withTransaction(
        async () => {
          // Re-fetch inside the transaction to guard against a concurrent payment.
          const fresh =
            await SplitBill.findById(
              splitBill._id
            ).session(session);

          if (
            !fresh ||
            fresh.status !==
              "AWAITING_PAYMENTS"
          ) {
            return;
          }

          const escrowAccountId =
            await getSystemAccountId(
              session
            );

          const paidParticipants =
            await SplitParticipant.find({
              splitBill: fresh._id,
              status: "PAID",
            }).session(session);

          for (const participant of paidParticipants) {
            const payerAccountId =
              await getAccountIdForUser(
                participant.user,
                session
              );

            const amount =
              participant.share;

            if (
              !Number.isInteger(amount) ||
              amount < 1
            ) {
              throw new Error(
                `Invalid refund amount for participant ${participant._id}`
              );
            }

            const refundTx =
              await moveFunds({
                session,
                fromAccountId:
                  escrowAccountId,
                toAccountId:
                  payerAccountId,
                amount,
                idempotencyKey: `split-refund:${participant._id}`,
                type: "SPLIT_BILL_REFUND",
              });

            participant.status =
              "REFUNDED";

            participant.refundTransaction =
              refundTx._id;

            await participant.save({
              session,
            });
          }

          await Bill.updateMany(
            {
              sourceSplitBill:
                fresh._id,
            },
            {
              status:
                "CANCELLED",
            },
            {
              session,
            }
          );

          fresh.status =
            "CANCELLED";

          await fresh.save({
            session,
          });
        }
      );

      const allParticipants =
        await SplitParticipant.find({
          splitBill:
            splitBill._id,
        });

      for (const participant of allParticipants) {
        sendNotification(
          participant.user,
          "Split bill expired and was cancelled/refunded.",
          {
            splitBillId:
              splitBill._id,
          }
        );
      }
    } catch (err) {
      console.error(
        `cancelExpiredSplitBills failed for ${splitBill._id}:`,
        err
      );
    } finally {
      await session.endSession();
    }
  }
};

// Exported for reuse by billController.
exports.paySplitShareCore = paySplitShareCore;