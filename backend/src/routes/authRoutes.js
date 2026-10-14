
const express = require("express");

const {
    iniciarSesion,
    consultarEstadoInicial,
    configurarPrimerAdministrador
} = require("../controllers/authController");

const {
    registrarIntentoAcceso
} = require("../services/accessService");

const router = express.Router();

// Comprobar si hace falta crear el primer administrador.
router.get(
    "/api/auth/setup-status",
    consultarEstadoInicial
);

// Crear el primer administrador si la tabla está vacía.
router.post(
    "/api/auth/setup",
    configurarPrimerAdministrador
);

// Iniciar sesión.
router.post("/api/auth/login", iniciarSesion);

// Consultar la sesión actual.
router.get("/api/auth/session", (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).json({
            autenticado: false
        });
    }

    return res.status(200).json({
        autenticado: true,
        usuario: req.session.usuario
    });
});

// Cerrar sesión.
router.post("/api/auth/logout", async (req, res) => {
    const usuario = req.session?.usuario;

    if (usuario) {
        await registrarIntentoAcceso({
            usuarioId: Number(usuario.usuarioId) || null,
            correo: usuario.correo,
            exitoso: true,
            motivo: "Cierre de sesión",
            ip: req.ip
        });
    }

    req.session.destroy((error) => {
        if (error) {
            console.error(
                "Error al cerrar sesión:",
                error.message
            );

            return res.status(500).json({
                error: "No fue posible cerrar la sesión."
            });
        }

        res.clearCookie("nissan.sid", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        });

        return res.status(200).json({
            mensaje: "Sesión cerrada correctamente."
        });
    });
});

module.exports = router;
