const express = require("express");
const app = express();

const authrouter=require("./routes/auth")

app.use("/api/auth",authrouter);

module.exports = app;