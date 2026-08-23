const Friend = require("../models/friendModel");
const User = require("../models/user");


module.exports.addFriend = async (req, res) => {
  try {
    const requesterId = req.user._id;
    const { friendId, friendEmail } = req.body;

    // Get the raw input from either field
    const input = (friendId || friendEmail || "").trim();

    if (!input) {
      return res.status(400).json({
        message: "Friend ID or Email is required",
      });
    }

    let targetUser = null;

    // Check if the input is an email address
    if (input.includes("@")) {
      targetUser = await User.findOne({
        email: input.toLowerCase(),
      }).select("_id");
    } else {
      
      targetUser = await User.findById(input).select("_id");
    }

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found with that ID or email",
      });
    }

    const targetId = targetUser._id;

    if (String(targetId) === String(requesterId)) {
      return res.status(400).json({
        message: "You cannot add yourself as a friend",
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
