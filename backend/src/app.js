const path = require("path");

const dotenv = require("dotenv");

dotenv.config({
    path: path.resolve(__dirname, "../../.env")
});

const express = require("express");
const webhookRoutes = require("./routes/webhookRoutes");

const app = express();

app.use(express.json());

app.use(webhookRoutes);

module.exports = app;