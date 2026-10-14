
"use strict";

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
    path: path.resolve(__dirname, "../../.env")
});

const express = require("express");
const session = require("express-session");

const webhookRoutes = require("./routes/webhookRoutes");
const authRoutes = require("./routes/authRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const clientRoutes = require("./routes/clientRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const historyRoutes = require("./routes/historyRoutes");
const userRoutes = require("./routes/userRoutes");
const securityRoutes = require("./routes/securityRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();
const publicPath = path.join(__dirname, "../public");

app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (!process.env.SESSION_SECRET) {
    throw new Error("Falta SESSION_SECRET en el archivo .env");
}

app.use(
    session({
        name: "nissan.sid",
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 30 * 60 * 1000
        }
    })
);

// Protege el panel administrativo.
app.get("/dashboard.html", (req, res) => {
    if (!req.session.usuario) {
        return res.redirect("/login.html");
    }

    return res.sendFile(
        path.join(publicPath, "dashboard.html")
    );
});

// Archivos públicos.
app.use(express.static(publicPath));

// Vistas HTML (EJS) para las interfaces del proyecto.
app.set("views", path.join(publicPath, "views"));
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

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

// Rutas existentes y nuevos módulos.
app.use(webhookRoutes);
app.use(authRoutes);
app.use(inventoryRoutes);
app.use(dashboardRoutes);
app.use(clientRoutes);
app.use(conversationRoutes);
app.use(appointmentRoutes);
app.use(historyRoutes);
app.use(userRoutes);
app.use(securityRoutes);
app.use(profileRoutes);

// Ruta para errores de solicitudes a rutas inexistentes.
app.use("/api", (req, res) => {
    res.status(404).json({
        ok: false,
        mensaje: "La ruta solicitada no existe."
    });
});

module.exports = app;
