const mongoose = require("mongoose");

const tokenBlacklistSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: [true, "Token is required to blacklist"],
            unique: true,
            trim: true,
        },

        
    },
    {
        timestamps: true,
    }
);

tokenBlacklistSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 60*60*24*1 }
);


const tokenBlacklistModel = mongoose.model(
    "TokenBlacklist",
    tokenBlacklistSchema
);

module.exports = tokenBlacklistModel;
