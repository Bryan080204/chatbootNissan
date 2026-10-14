
"use strict";

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const { sql, obtenerConexion } = require("../config/database");
const {
    requiereSesion,
    obtenerUsuario,
    obtenerUsuarioId
} = require("../middleware/auth");
const { registrarAuditoria } = require("../services/auditService");

const ROUNDS_BCRYPT = 12;

// GET /api/mi-cuenta
router.get(
    "/api/mi-cuenta",
    requiereSesion,
    async (req, res) => {
        try {
            const usuarioId = obtenerUsuarioId(req);

            const pool = await obtenerConexion();

            const resultado = await pool.request()
                .input("id", sql.BigInt, usuarioId)
                .query(`
                    SELECT
                        u.UsuarioId,
                        u.Nombre,
                        u.Correo,
                        r.Nombre AS Rol,
                        u.Activo,
                        u.DebeCambiarPassword,
                        u.UltimoAcceso,
                        u.FechaCreacion
                    FROM dbo.Usuarios AS u
                    INNER JOIN dbo.Roles AS r ON r.RolId = u.RolId
                    WHERE u.UsuarioId = @id;
                `);

            if (!resultado.recordset.length) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "No fue posible encontrar tu usuario."
                });
            }

            return res.json({
                ok: true,
                perfil: resultado.recordset[0]
            });
        } catch (error) {
            console.error("Error consultando el perfil:", error.message);
            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible consultar tu información."
            });
        }
    }
);

// POST /api/mi-cuenta/password
router.post(
    "/api/mi-cuenta/password",
    requiereSesion,
    async (req, res) => {
        try {
            const { actual, nueva, confirmar } = req.body || {};

            if (
                typeof actual !== "string" ||
                typeof nueva !== "string" ||
                typeof confirmar !== "string"
            ) {
                return res.status(400).json({
                    ok: false,
                    mensaje:
                        "La contraseña actual, la nueva y su confirmación son obligatorias."
                });
            }

            if (!actual) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Escribe tu contraseña actual."
                });
            }

            if (nueva.length < 8 || nueva.length > 128) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "La nueva contraseña debe tener entre 8 y 128 caracteres."
                });
            }

            if (nueva !== confirmar) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "La nueva contraseña y su confirmación no coinciden."
                });
            }

            if (nueva === actual) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "La nueva contraseña debe ser diferente a la actual."
                });
            }

            const usuarioId = obtenerUsuarioId(req);
            const pool = await obtenerConexion();

            const resultado = await pool.request()
                .input("id", sql.BigInt, usuarioId)
                .query(`
                    SELECT PasswordHash FROM dbo.Usuarios
                    WHERE UsuarioId = @id;
                `);

            if (!resultado.recordset.length) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "No fue posible encontrar tu usuario."
                });
            }

            const coincide = await bcrypt.compare(
                actual,
                resultado.recordset[0].PasswordHash
            );

            if (!coincide) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "La contraseña actual no es correcta."
                });
            }

            const passwordHash = await bcrypt.hash(nueva, ROUNDS_BCRYPT);

            await pool.request()
                .input("id", sql.BigInt, usuarioId)
                .input("passwordHash", sql.NVarChar(255), passwordHash)
                .query(`
                    UPDATE dbo.Usuarios
                    SET PasswordHash = @passwordHash,
                        DebeCambiarPassword = 0,
                        FechaActualizacion = SYSDATETIME()
                    WHERE UsuarioId = @id;
                `);

            await registrarAuditoria(pool, {
                usuarioId,
                accion: "CAMBIAR_PASSWORD",
                tablaAfectada: "Usuarios",
                registroId: usuarioId,
                detalle: "El usuario cambió su propia contraseña.",
                ip: req.ip
            });

            // Renueva el identificador de sesión sin cerrar la sesión actual.
            const usuario = obtenerUsuario(req);

            req.session.regenerate((error) => {
                if (error) {
                    console.error(
                        "Error al renovar la sesión:",
                        error.message
                    );
                    return res.json({
                        ok: true,
                        mensaje:
                            "Tu contraseña se actualizó correctamente. Vuelve a iniciar sesión si tu sesión presenta problemas."
                    });
                }

                req.session.usuario = {
                    ...usuario,
                    debeCambiarPassword: false
                };

                req.session.save(() => {
                    return res.json({
                        ok: true,
                        mensaje: "Tu contraseña se actualizó correctamente."
                    });
                });
            });
        } catch (error) {
            console.error("Error cambiando la contraseña:", error.message);
            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible actualizar tu contraseña."
            });
        }
    }
);

module.exports = router;
