const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");

const userSchema = new mongoose.Schema(
{
    email: {
        type: String,
        required: [true, "Email is required"],
        trim: true,
        lowercase: true,
        unique: true,
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            "Please enter a valid email address"
        ]
    },

    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true
    },

    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: 6,
        select: false
    }
},
{
    timestamps: true
});


// Password hashing middleware
userSchema.pre("save", async function () {

    if (!this.isModified("password")) {
        return;
    }

    this.password = await bcryptjs.hash(this.password, 10);
});


// Password comparison method
userSchema.methods.comparePassword = async function(password) {
    return await bcryptjs.compare(password, this.password);
};


const userModel = mongoose.model("User", userSchema);

module.exports = userModel;
