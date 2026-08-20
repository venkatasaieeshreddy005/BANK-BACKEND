const Friend = require("../models/friendModel");
const User = require("../models/user");

// POST /api/friends  { friendId }  OR { friendEmail }
module.exports.addFriend = async (req, res) => {
  try {
    const requesterId = req.user._id;
    const { friendId, friendEmail } = req.body;

    let targetId = friendId;

    if (!targetId && friendEmail) {
      const targetUser = await User.findOne({
        email: friendEmail.toLowerCase(),
      }).select("_id");

      if (!targetUser) {
        return res.status(404).json({
          message: "No user with that email",
        });
      }

      targetId = targetUser._id;
    }

    if (!targetId) {
      return res.status(400).json({
        message: "friendId or friendEmail is required",
      });
    }

    if (String(targetId) === String(requesterId)) {
      return res.status(400).json({
        message: "You cannot add yourself as a friend",
      });
    }

    const targetExists = await User.exists({
      _id: targetId,
    });

    if (!targetExists) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const friend = await Friend.create({
      user: requesterId,
      friend: targetId,
    });

    return res.status(201).json({
      friend,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Already added as a friend",
      });
    }

    console.error("addFriend error:", err);

    return res.status(500).json({
      message: "Failed to add friend",
    });
  }
};

// GET /api/friends
module.exports.listFriends = async (req, res) => {
  try {
    const userId = req.user._id;

    const friends = await Friend.find({
      user: userId,
    })
      .populate("friend", "name email")
      .sort({
        createdAt: -1,
      });

    return res.json({
      friends,
    });
  } catch (err) {
    console.error("listFriends error:", err);

    return res.status(500).json({
      message: "Failed to list friends",
    });
  }
};

// DELETE /api/friends/:friendId
module.exports.removeFriend = async (req, res) => {
  try {
    const userId = req.user._id;
    const { friendId } = req.params;

    const deleted =
      await Friend.findOneAndDelete({
        user: userId,
        friend: friendId,
      });

    if (!deleted) {
      return res.status(404).json({
        message: "Friend not found",
      });
    }

    return res.json({
      message: "Friend removed",
    });
  } catch (err) {
    console.error("removeFriend error:", err);

    return res.status(500).json({
      message: "Failed to remove friend",
    });
  }
};
