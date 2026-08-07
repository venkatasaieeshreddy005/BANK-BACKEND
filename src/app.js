const express = require("express");
const app = express();

const cookieparser=require("cookie-parser");


app.use(express.json());
app.use(cookieparser());

const authrouter=require("./routes/auth");



app.use("/api/auth",authrouter);

module.exports = app;