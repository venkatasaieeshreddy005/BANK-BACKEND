// 1. Load environment variables FIRST
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

// 2. Import modules AFTER env vars are loaded
const mongoose = require("mongoose");
const cron = require("node-cron");

const app = require("./src/app");
const connectDB = require("./src/config/db");
const { cancelExpiredSplitBills } = require("./src/controller/splitBillController");

// 3. Connect DB and start server
connectDB();

// Only start the cron job once Mongo is actually connected —
// running it before that would throw on every DB call.
mongoose.connection.once("open", () => {
    console.log("MongoDB connected — starting scheduled jobs");

    // Runs every 5 minutes. Refunds/cancels any split bill
    // whose expiresAt has passed and is still AWAITING_PAYMENTS.
    cron.schedule("*/5 * * * *", async () => {
        try {
            await cancelExpiredSplitBills();
        } catch (err) {
            console.error("cancelExpiredSplitBills cron failed:", err);
        }
    });

    // Run once immediately on boot too, so bills that expired
    // while the server was down don't sit stuck until the next tick.
    cancelExpiredSplitBills().catch((err) =>
        console.error("cancelExpiredSplitBills initial run failed:", err)
    );
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});