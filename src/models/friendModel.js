const mongoose = require("mongoose");
const { Schema } = mongoose;

const friendSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    friend: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

friendSchema.index({ user: 1, friend: 1 }, { unique: true });

// Synchronous hook: removed async / next handling to prevent runtime errors
friendSchema.pre("validate", function () {
  if (this.user && this.friend && this.user.equals(this.friend)) {
    throw new Error("A user cannot add themselves as a friend");
  }
});

module.exports = mongoose.model("Friend", friendSchema);