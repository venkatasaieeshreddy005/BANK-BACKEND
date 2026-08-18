const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authrouter = require("./routes/auth");
const accountRouter = require("./routes/account");
const transactionRouter = require("./routes/transaction");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use(cookieParser(process.env.COOKIE_SECRET));

app.get("/", (req, res) => {
  res.send("Bank Ledger Server is Running Successfully");
});

app.use("/api/auth", authrouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRouter);

module.exports = app;