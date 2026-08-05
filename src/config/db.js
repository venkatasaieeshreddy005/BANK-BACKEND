const mongoose = require("mongoose");

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to database");
    } catch (err) {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    }
}

module.exports = connectDB;
