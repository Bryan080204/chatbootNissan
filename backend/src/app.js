const path = require("path");

const dotenv = require("dotenv");

dotenv.config({
    path: path.resolve(__dirname, "../../.env")
});

const express = require("express");
const webhookRoutes = require("./routes/webhookRoutes");

const app = express();

app.use(express.json());

// Archivos estáticos
app.use(express.static(path.join(__dirname, "../public")));

// Vistas HTML
app.set("views", path.join(__dirname, "../public/views"));
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

// Rutas de interfaz
app.get("/", (req, res) => {
    res.render("index", { layout: false });
});

app.get("/login", (req, res) => {
    res.render("login", { layout: false });
});

app.get("/admin/login", (req, res) => {
    res.render("admin-login", { layout: false });
});

app.get("/admin/dashboard", (req, res) => {
    res.render("admin-dashboard", { layout: false });
});

app.get("/admin/chats", (req, res) => {
    res.render("admin-chats", { layout: false });
});

app.get("/admin/citas", (req, res) => {
    res.render("admin-citas", { layout: false });
});

app.get("/admin/config", (req, res) => {
    res.render("admin-config", { layout: false });
});

app.get("/admin/usuarios", (req, res) => {
    res.render("admin-usuarios", { layout: false });
});

app.use(webhookRoutes);

module.exports = app;