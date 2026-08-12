const express = require("express");
const app = express();

const cookieparser=require("cookie-parser");
const authrouter=require("./routes/auth");
const accountRouter=require("./routes/account");
const transactionRouter=require("./routes/transaction");




app.use(express.json());
const cookieParser = require("cookie-parser");

app.use(cookieParser(process.env.COOKIE_SECRET));



app.get("/",(req,res)=>{
    res.send("Bank Ledger Server is Running Successfully")
})



app.use("/api/auth",authrouter);
app.use("/api/accounts",accountRouter);
app.use("/api/transactions",transactionRouter);

module.exports = app;