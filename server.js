// 1. Load environment variables FIRST
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

// 2. Import modules AFTER env vars are loaded
const app = require("./src/app");
const connectDB = require("./src/config/db");

// 3. Connect DB and start server
connectDB();

app.listen(3000, () => {
    console.log("Server running on port 3000");
});