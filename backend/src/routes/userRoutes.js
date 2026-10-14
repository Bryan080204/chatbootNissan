
"use strict";

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const { sql, obtenerConexion } = require("../config/database");
const {
    requiereSesion,
    requiereAdministrador,
    obtenerUsuarioId
} = require("../middleware/auth");
const { registrarAuditoria } = require("../services/auditService");

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROUNDS_BCRYPT = 12;

function validarId(valor) {
    const id = Number(valor);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validarDatosUsuario(datos, { conPassword }) {
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
        return "Los datos enviados no son válidos.";
    }

    const nombre = String(datos.Nombre || "").trim();
    const correo = String(datos.Correo || "").trim();
    const rolId = Number(datos.RolId);

    if (!nombre) return "El nombre es obligatorio.";
    if (nombre.length > 150) return "El nombre no puede superar 150 caracteres.";
    if (!correo) return "El correo es obligatorio.";
    if (correo.length > 254 || !REGEX_CORREO.test(correo)) {
        return "Escribe un correo electrónico válido.";
    }
    if (!Number.isInteger(rolId) || rolId <= 0) {
        return "Selecciona un rol válido.";
    }

    if (conPassword) {
        const password = String(datos.Password || "");
        if (password.length < 8) {
            return "La contraseña debe tener al menos 8 caracteres.";
        }
        if (password.length > 128) {
            return "La contraseña no puede superar 128 caracteres.";
        }
    }

    return null;
}

async function contarAdministradoresActivos(pool, excluirId = null) {
    const request = pool.request();

    let sqlExcluir = "";

    if (excluirId) {
        request.input("excluir", sql.BigInt, excluirId);
        sqlExcluir = "AND u.UsuarioId <> @excluir";
    }

    const resultado = await request.query(`
        SELECT COUNT_BIG(*) AS Total
        FROM dbo.Usuarios AS u
        INNER JOIN dbo.Roles AS r ON r.RolId = u.RolId
        WHERE u.Activo = 1
          AND LOWER(r.Nombre) = 'administrador'
          ${sqlExcluir};
    `);

    return Number(resultado.recordset[0].Total);
}

// GET /api/usuarios/roles
router.get(
    "/api/usuarios/roles",
    requiereSesion,
    requiereAdministrador,
    async (req, res) => {
        try {
            const pool = await obtenerConexion();

            const resultado = await pool.request().query(`
                SELECT RolId, Nombre, Descripcion
                FROM dbo.Roles
                WHERE Activo = 1
                ORDER BY RolId;
            `);

            return res.json({ ok: true, roles: resultado.recordset });
        } catch (error) {
            console.error("Error consultando roles:", error.message);
            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible consultar los roles."
            });
        }
    }
);

// GET /api/usuarios?buscar=&rolId=&activo=
router.get(
    "/api/usuarios",
    requiereSesion,
    requiereAdministrador,
    async (req, res) => {
        try {
            const pool = await obtenerConexion();
            const request = pool.request();

            const buscar = String(req.query.buscar || "").trim();
            const rolId = Number(req.query.rolId);
            const activo = String(req.query.activo ?? "").trim();
            const filtros = [];

            if (buscar) {
                request.input("buscar", sql.NVarChar(150), `%${buscar}%`);
                filtros.push("(u.Nombre LIKE @buscar OR u.Correo LIKE @buscar)");
            }

            if (Number.isInteger(rolId) && rolId > 0) {
                request.input("rolId", sql.Int, rolId);
                filtros.push("u.RolId = @rolId");
            }

            if (activo === "1" || activo === "0") {
                request.input("activo", sql.Bit, Number(activo));
                filtros.push("u.Activo = @activo");
            }

            const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

            const resultado = await request.query(`
                SELECT
                    u.UsuarioId,
                    u.RolId,
                    r.Nombre AS Rol,
                    u.Nombre,
                    u.Correo,
                    u.Activo,
                    u.DebeCambiarPassword,
                    u.UltimoAcceso,
                    u.FechaCreacion,
                    u.FechaActualizacion
                FROM dbo.Usuarios AS u
                INNER JOIN dbo.Roles AS r ON r.RolId = u.RolId
                ${where}
                ORDER BY u.UsuarioId DESC;
            `);

            return res.json({
                ok: true,
                total: resultado.recordset.length,
                usuarios: resultado.recordset
            });
        } catch (error) {
            console.error("Error consultando usuarios:", error.message);
            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible consultar los usuarios."
            });
        }
    }
);

// POST /api/usuarios
router.post(
    "/api/usuarios",
    requiereSesion,
    requiereAdministrador,
    async (req, res) => {
        try {
            const errorValidacion = validarDatosUsuario(req.body, {
                conPassword: true
            });

            if (errorValidacion) {
                return res.status(400).json({
                    ok: false,
                    mensaje: errorValidacion
                });
            }

            const datos = req.body;
            const pool = await obtenerConexion();

            const rol = await pool.request()
                .input("rolId", sql.Int, Number(datos.RolId))
                .query(`
                    SELECT RolId FROM dbo.Roles
                    WHERE RolId = @rolId AND Activo = 1;
                `);

            if (!rol.recordset.length) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El rol seleccionado no existe o está inactivo."
                });
            }

            const passwordHash = await bcrypt.hash(
                String(datos.Password),
                ROUNDS_BCRYPT
            );

            const resultado = await pool.request()
                .input("rolId", sql.Int, Number(datos.RolId))
                .input("nombre", sql.NVarChar(150), String(datos.Nombre).trim())
                .input("correo", sql.NVarChar(254), String(datos.Correo).trim())
                .input("passwordHash", sql.NVarChar(255), passwordHash)
                .input("activo", sql.Bit, datos.Activo === false ? 0 : 1)
                .query(`
                    INSERT INTO dbo.Usuarios (
                        RolId, Nombre, Correo, PasswordHash,
                        Activo, DebeCambiarPassword, FechaCreacion
                    )
                    OUTPUT INSERTED.UsuarioId
                    VALUES (
                        @rolId, @nombre, @correo, @passwordHash,
                        @activo, 1, SYSDATETIME()
                    );
                `);

            const nuevoId = resultado.recordset[0].UsuarioId;

            await registrarAuditoria(pool, {
                usuarioId: obtenerUsuarioId(req),
                accion: "CREAR_USUARIO",
                tablaAfectada: "Usuarios",
                registroId: nuevoId,
                detalle: `Se creó el usuario ${datos.Correo}.`,
                ip: req.ip
            });

            return res.status(201).json({
                ok: true,
                mensaje: "Usuario creado correctamente.",
                usuarioId: nuevoId
            });
        } catch (error) {
            if (error.number === 2627 || error.number === 2601) {
                return res.status(409).json({
                    ok: false,
                    mensaje: "Ese correo ya está registrado."
                });
            }

            console.error("Error creando usuario:", error.message);
            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible crear el usuario."
            });
        }
    }
);

// PUT /api/usuarios/:id
router.put(
    "/api/usuarios/:id",
    requiereSesion,
    requiereAdministrador,
    async (req, res) => {
        try {
            const usuarioId = validarId(req.params.id);

            if (!usuarioId) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El identificador no es válido."
                });
            }

            const errorValidacion = validarDatosUsuario(req.body, {
                conPassword: false
            });

            if (errorValidacion) {
                return res.status(400).json({
                    ok: false,
                    mensaje: errorValidacion
                });
            }

            const datos = req.body;
            const pool = await obtenerConexion();

            const actual = await pool.request()
                .input("id", sql.BigInt, usuarioId)
                .query(`
                    SELECT u.UsuarioId, u.RolId, r.Nombre AS Rol, u.Activo
                    FROM dbo.Usuarios AS u
                    INNER JOIN dbo.Roles AS r ON r.RolId = u.RolId
                    WHERE u.UsuarioId = @id;
                `);

            if (!actual.recordset.length) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "El usuario no existe."
                });
            }

            const rolNuevo = await pool.request()
                .input("rolId", sql.Int, Number(datos.RolId))
                .query(`
                    SELECT Nombre FROM dbo.Roles
                    WHERE RolId = @rolId AND Activo = 1;
                `);

            if (!rolNuevo.recordset.length) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El rol seleccionado no existe o está inactivo."
                });
            }

            const eraAdmin =
                String(actual.recordset[0].Rol).toLowerCase() === "administrador";
            const seraAdmin =
                String(rolNuevo.recordset[0].Nombre).toLowerCase() === "administrador";
            const activo = datos.Activo === false ? 0 : 1;

            // Proteger al último administrador activo.
            if (eraAdmin && (!seraAdmin || activo === 0)) {
                const restantes = await contarAdministradoresActivos(
                    pool,
                    usuarioId
                );

                if (restantes === 0) {
                    return res.status(409).json({
                        ok: false,
                        mensaje:
                            "No puedes quitar el rol administrador ni desactivar al último administrador activo."
                    });
                }
            }

            // Proteger al administrador actual de desactivarse a sí mismo.
            if (usuarioId === obtenerUsuarioId(req) && activo === 0) {
                return res.status(409).json({
                    ok: false,
                    mensaje: "No puedes desactivar tu propio usuario."
                });
            }

            const resultado = await pool.request()
                .input("id", sql.BigInt, usuarioId)
                .input("rolId", sql.Int, Number(datos.RolId))
                .input("nombre", sql.NVarChar(150), String(datos.Nombre).trim())
                .input("correo", sql.NVarChar(254), String(datos.Correo).trim())
                .input("activo", sql.Bit, activo)
                .query(`
                    UPDATE dbo.Usuarios
                    SET RolId = @rolId,
                        Nombre = @nombre,
                        Correo = @correo,
                        Activo = @activo,
                        FechaActualizacion = SYSDATETIME()
                    WHERE UsuarioId = @id;

                    SELECT @@ROWCOUNT AS FilasAfectadas;
                `);

            if (!resultado.recordset[0].FilasAfectadas) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "El usuario no existe."
                });
            }

            await registrarAuditoria(pool, {
                usuarioId: obtenerUsuarioId(req),
                accion: "EDITAR_USUARIO",
                tablaAfectada: "Usuarios",
                registroId: usuarioId,
                detalle: `Se actualizó el usuario ${datos.Correo}.`,
                ip: req.ip
            });

            return res.json({
                ok: true,
                mensaje: "Usuario actualizado correctamente."
            });
        } catch (error) {
            if (error.number === 2627 || error.number === 2601) {
                return res.status(409).json({
                    ok: false,
                    mensaje: "Ese correo ya está registrado."
                });
            }

            console.error("Error actualizando usuario:", error.message);
            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible actualizar el usuario."
            });
        }
    }
);

// PATCH /api/usuarios/:id/activo
router.patch(
    "/api/usuarios/:id/activo",
    requiereSesion,
    requiereAdministrador,
    async (req, res) => {
        try {
            const usuarioId = validarId(req.params.id);
            const activo = req.body?.activo;

            if (!usuarioId) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El identificador no es válido."
                });
            }

            if (typeof activo !== "boolean") {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El campo activo debe ser true o false."
                });
            }

            if (usuarioId === obtenerUsuarioId(req) && !activo) {
                return res.status(409).json({
                    ok: false,
                    mensaje: "No puedes desactivar tu propio usuario."
                });
            }

            const pool = await obtenerConexion();

            const actual = await pool.request()
                .input("id", sql.BigInt, usuarioId)
                .query(`
                    SELECT u.UsuarioId, r.Nombre AS Rol
                    FROM dbo.Usuarios AS u
                    INNER JOIN dbo.Roles AS r ON r.RolId = u.RolId
                    WHERE u.UsuarioId = @id;
                `);

            if (!actual.recordset.length) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "El usuario no existe."
                });
            }

            const eraAdmin =
                String(actual.recordset[0].Rol).toLowerCase() === "administrador";

            if (eraAdmin && !activo) {
                const restantes = await contarAdministradoresActivos(pool, usuarioId);

                if (restantes === 0) {
                    return res.status(409).json({
                        ok: false,
                        mensaje:
                            "No puedes desactivar al último administrador activo."
                    });
                }
            }

            await pool.request()
                .input("id", sql.BigInt, usuarioId)
                .input("activo", sql.Bit, activo)
                .query(`
                    UPDATE dbo.Usuarios
                    SET Activo = @activo,
                        FechaActualizacion = SYSDATETIME()
                    WHERE UsuarioId = @id;
                `);

            await registrarAuditoria(pool, {
                usuarioId: obtenerUsuarioId(req),
                accion: activo ? "ACTIVAR_USUARIO" : "DESACTIVAR_USUARIO",
                tablaAfectada: "Usuarios",
                registroId: usuarioId,
                detalle: activo
                    ? "Se activó el usuario."
                    : "Se desactivó el usuario.",
                ip: req.ip
            });

            return res.json({
                ok: true,
                mensaje: activo
                    ? "Usuario activado correctamente."
                    : "Usuario desactivado correctamente."
            });
        } catch (error) {
            console.error("Error cambiando estado del usuario:", error.message);
            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible cambiar el estado del usuario."
            });
        }
    }
);

// PATCH /api/usuarios/:id/password  (restablecimiento por administrador)
router.patch(
    "/api/usuarios/:id/password",
    requiereSesion,
    requiereAdministrador,
    async (req, res) => {
        try {
            const usuarioId = validarId(req.params.id);
            const password = String(req.body?.password || "");

            if (!usuarioId) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El identificador no es válido."
                });
            }

            if (password.length < 8 || password.length > 128) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "La contraseña debe tener entre 8 y 128 caracteres."
                });
            }

            const pool = await obtenerConexion();

            const passwordHash = await bcrypt.hash(password, ROUNDS_BCRYPT);

            const resultado = await pool.request()
                .input("id", sql.BigInt, usuarioId)
                .input("passwordHash", sql.NVarChar(255), passwordHash)
                .query(`
                    UPDATE dbo.Usuarios
                    SET PasswordHash = @passwordHash,
                        DebeCambiarPassword = 1,
                        FechaActualizacion = SYSDATETIME()
                    WHERE UsuarioId = @id;

                    SELECT @@ROWCOUNT AS FilasAfectadas;
                `);

            if (!resultado.recordset[0].FilasAfectadas) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "El usuario no existe."
                });
            }

            await registrarAuditoria(pool, {
                usuarioId: obtenerUsuarioId(req),
                accion: "RESTABLECER_PASSWORD",
                tablaAfectada: "Usuarios",
                registroId: usuarioId,
                detalle: "Un administrador restableció la contraseña.",
                ip: req.ip
            });

            return res.json({
                ok: true,
                mensaje:
                    "Contraseña restablecida. El usuario deberá cambiarla al iniciar sesión."
            });
        } catch (error) {
            console.error("Error restableciendo contraseña:", error.message);
            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible restablecer la contraseña."
            });
        }
    }
);

module.exports = router;
