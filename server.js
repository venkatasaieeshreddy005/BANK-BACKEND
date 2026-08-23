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

mongoose.connection.once("open", () => {
    console.log("MongoDB connected — starting scheduled jobs");

   
    cron.schedule("*/5 * * * *", async () => {
        try {
            await cancelExpiredSplitBills();
        } catch (err) {
            console.error("cancelExpiredSplitBills cron failed:", err);
        }
    });

  
    cancelExpiredSplitBills().catch((err) =>
        console.error("cancelExpiredSplitBills initial run failed:", err)
    );
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});