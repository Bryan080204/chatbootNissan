
"use strict";

const express = require("express");
const router = express.Router();

const { sql, obtenerConexion } = require("../config/database");
const {
    requiereSesion,
    requiereRoles,
    obtenerUsuarioId
} = require("../middleware/auth");
const { registrarAuditoria } = require("../services/auditService");
const { tablaExiste } = require("../services/dashboardService");

const ESTADOS = [
    "Pendiente",
    "Confirmada",
    "Cancelada",
    "Completada",
    "Reprogramada"
];

const SERVICIOS_SUGERIDOS = [
    "Prueba de manejo",
    "Cotización",
    "Mantenimiento",
    "Entrega de vehículo",
    "Asesoría comercial"
];

function validarId(valor) {
    const id = Number(valor);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function textoOpcional(valor) {
    if (valor == null) return null;
    const texto = String(valor).trim();
    return texto || null;
}

function validarCita(datos) {
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
        return "Los datos enviados no son válidos.";
    }

    const nombre = String(datos.NombreCliente || "").trim();

    if (!nombre) {
        return "El nombre del cliente es obligatorio.";
    }

    if (nombre.length > 150) {
        return "El nombre no puede superar 150 caracteres.";
    }

    const servicio = String(datos.Servicio || "").trim();

    if (!servicio) {
        return "El servicio es obligatorio.";
    }

    if (servicio.length > 100) {
        return "El servicio no puede superar 100 caracteres.";
    }

    if (datos.TelefonoCliente && String(datos.TelefonoCliente).trim().length > 30) {
        return "El teléfono no puede superar 30 caracteres.";
    }

    if (datos.CorreoCliente && String(datos.CorreoCliente).trim().length > 254) {
        return "El correo no puede superar 254 caracteres.";
    }

    if (datos.Notas && String(datos.Notas).trim().length > 500) {
        return "Las notas no pueden superar 500 caracteres.";
    }

    const fecha = new Date(datos.FechaCita);

    if (!datos.FechaCita || Number.isNaN(fecha.getTime())) {
        return "La fecha de la cita no es válida.";
    }

    if (!ESTADOS.includes(datos.Estado)) {
        return "El estado de la cita no es válido.";
    }

    if (
        datos.ModeloId != null &&
        datos.ModeloId !== "" &&
        !validarId(datos.ModeloId)
    ) {
        return "El modelo seleccionado no es válido.";
    }

    return null;
}

async function comprobarTabla(pool, res) {
    if (!(await tablaExiste(pool, "Citas"))) {
        res.status(503).json({
            ok: false,
            mensaje:
                "El módulo de citas requiere la tabla dbo.Citas. " +
                "Ejecuta database/migration_citas.sql y vuelve a intentarlo."
        });
        return false;
    }

    return true;
}

// GET /api/citas/opciones
router.get(
    "/api/citas/opciones",
    requiereSesion,
    (req, res) => {
        return res.json({
            ok: true,
            estados: ESTADOS,
            servicios: SERVICIOS_SUGERIDOS
        });
    }
);

// GET /api/citas?buscar=&estado=&desde=&hasta=&proximas=1
router.get(
    "/api/citas",
    requiereSesion,
    async (req, res) => {
        try {
            const pool = await obtenerConexion();

            if (!(await comprobarTabla(pool, res))) return;

            const request = pool.request();
            const buscar = String(req.query.buscar || "").trim();
            const estado = String(req.query.estado || "").trim();
            const desde = String(req.query.desde || "").trim();
            const hasta = String(req.query.hasta || "").trim();
            const proximas = String(req.query.proximas || "") === "1";

            const filtros = [];

            if (buscar) {
                request.input("buscar", sql.NVarChar(150), `%${buscar}%`);
                filtros.push(`
                    (
                        c.NombreCliente LIKE @buscar
                        OR c.TelefonoCliente LIKE @buscar
                        OR c.CorreoCliente LIKE @buscar
                        OR c.Servicio LIKE @buscar
                    )
                `);
            }

            if (estado) {
                if (!ESTADOS.includes(estado)) {
                    return res.status(400).json({
                        ok: false,
                        mensaje: "El filtro de estado no es válido."
                    });
                }
                request.input("estado", sql.NVarChar(30), estado);
                filtros.push("c.Estado = @estado");
            }

            if (desde) {
                const fecha = new Date(desde);
                if (Number.isNaN(fecha.getTime())) {
                    return res.status(400).json({
                        ok: false,
                        mensaje: "La fecha inicial no es válida."
                    });
                }
                request.input("desde", sql.DateTime2, fecha);
                filtros.push("c.FechaCita >= @desde");
            }

            if (hasta) {
                const fecha = new Date(hasta);
                if (Number.isNaN(fecha.getTime())) {
                    return res.status(400).json({
                        ok: false,
                        mensaje: "La fecha final no es válida."
                    });
                }
                request.input("hasta", sql.DateTime2, fecha);
                filtros.push("c.FechaCita <= @hasta");
            }

            if (proximas) {
                filtros.push(
                    "c.FechaCita >= SYSDATETIME() AND c.Estado IN ('Pendiente','Confirmada','Reprogramada')"
                );
            }

            const where = filtros.length
                ? `WHERE ${filtros.join(" AND ")}`
                : "";

            const resultado = await request.query(`
                SELECT
                    c.CitaId,
                    c.ConversacionId,
                    c.ModeloId,
                    c.NombreCliente,
                    c.TelefonoCliente,
                    c.CorreoCliente,
                    c.Servicio,
                    c.FechaCita,
                    c.Estado,
                    c.Notas,
                    c.FechaCreacion,
                    c.FechaActualizacion,
                    M.Nombre AS Modelo
                FROM dbo.Citas AS c
                LEFT JOIN dbo.Modelos AS M
                    ON M.ModeloId = c.ModeloId
                ${where}
                ORDER BY c.FechaCita DESC;
            `);

            return res.json({
                ok: true,
                total: resultado.recordset.length,
                estados: ESTADOS,
                citas: resultado.recordset
            });
        } catch (error) {
            console.error("Error consultando citas:", error.message);

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible consultar las citas."
            });
        }
    }
);

// POST /api/citas
router.post(
    "/api/citas",
    requiereSesion,
    requiereRoles("administrador", "vendedor"),
    async (req, res) => {
        try {
            const errorValidacion = validarCita(req.body);

            if (errorValidacion) {
                return res.status(400).json({
                    ok: false,
                    mensaje: errorValidacion
                });
            }

            const pool = await obtenerConexion();

            if (!(await comprobarTabla(pool, res))) return;

            const datos = req.body;

            const resultado = await pool.request()
                .input("nombre", sql.NVarChar(150), String(datos.NombreCliente).trim())
                .input("telefono", sql.NVarChar(30), textoOpcional(datos.TelefonoCliente))
                .input("correo", sql.NVarChar(254), textoOpcional(datos.CorreoCliente))
                .input("servicio", sql.NVarChar(100), String(datos.Servicio).trim())
                .input("fecha", sql.DateTime2, new Date(datos.FechaCita))
                .input("estado", sql.NVarChar(30), datos.Estado)
                .input("notas", sql.NVarChar(500), textoOpcional(datos.Notas))
                .input("modeloId", sql.Int, validarId(datos.ModeloId) || null)
                .input("conversacionId", sql.BigInt, validarId(datos.ConversacionId) || null)
                .input("usuarioId", sql.BigInt, obtenerUsuarioId(req))
                .query(`
                    INSERT INTO dbo.Citas (
                        ConversacionId,
                        ModeloId,
                        UsuarioId,
                        NombreCliente,
                        TelefonoCliente,
                        CorreoCliente,
                        Servicio,
                        FechaCita,
                        Estado,
                        Notas
                    )
                    OUTPUT INSERTED.CitaId
                    VALUES (
                        @conversacionId,
                        @modeloId,
                        @usuarioId,
                        @nombre,
                        @telefono,
                        @correo,
                        @servicio,
                        @fecha,
                        @estado,
                        @notas
                    );
                `);

            const nuevoId = resultado.recordset[0].CitaId;

            await registrarAuditoria(pool, {
                usuarioId: obtenerUsuarioId(req),
                accion: "CREAR_CITA",
                tablaAfectada: "Citas",
                registroId: nuevoId,
                detalle: `Cita para ${datos.NombreCliente} (${datos.Servicio}).`,
                ip: req.ip
            });

            return res.status(201).json({
                ok: true,
                mensaje: "Cita registrada correctamente.",
                citaId: nuevoId
            });
        } catch (error) {
            console.error("Error registrando cita:", error.message);

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible registrar la cita."
            });
        }
    }
);

// PUT /api/citas/:id
router.put(
    "/api/citas/:id",
    requiereSesion,
    requiereRoles("administrador", "vendedor"),
    async (req, res) => {
        try {
            const citaId = validarId(req.params.id);

            if (!citaId) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El identificador no es válido."
                });
            }

            const errorValidacion = validarCita(req.body);

            if (errorValidacion) {
                return res.status(400).json({
                    ok: false,
                    mensaje: errorValidacion
                });
            }

            const pool = await obtenerConexion();

            if (!(await comprobarTabla(pool, res))) return;

            const datos = req.body;

            const resultado = await pool.request()
                .input("id", sql.Int, citaId)
                .input("nombre", sql.NVarChar(150), String(datos.NombreCliente).trim())
                .input("telefono", sql.NVarChar(30), textoOpcional(datos.TelefonoCliente))
                .input("correo", sql.NVarChar(254), textoOpcional(datos.CorreoCliente))
                .input("servicio", sql.NVarChar(100), String(datos.Servicio).trim())
                .input("fecha", sql.DateTime2, new Date(datos.FechaCita))
                .input("estado", sql.NVarChar(30), datos.Estado)
                .input("notas", sql.NVarChar(500), textoOpcional(datos.Notas))
                .input("modeloId", sql.Int, validarId(datos.ModeloId) || null)
                .query(`
                    UPDATE dbo.Citas
                    SET
                        ModeloId = @modeloId,
                        NombreCliente = @nombre,
                        TelefonoCliente = @telefono,
                        CorreoCliente = @correo,
                        Servicio = @servicio,
                        FechaCita = @fecha,
                        Estado = @estado,
                        Notas = @notas,
                        FechaActualizacion = SYSDATETIME()
                    WHERE CitaId = @id;

                    SELECT @@ROWCOUNT AS FilasAfectadas;
                `);

            if (!resultado.recordset[0].FilasAfectadas) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "La cita no existe."
                });
            }

            await registrarAuditoria(pool, {
                usuarioId: obtenerUsuarioId(req),
                accion: "EDITAR_CITA",
                tablaAfectada: "Citas",
                registroId: citaId,
                detalle: "Se actualizaron los datos de la cita.",
                ip: req.ip
            });

            return res.json({
                ok: true,
                mensaje: "Cita actualizada correctamente."
            });
        } catch (error) {
            console.error("Error actualizando cita:", error.message);

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible actualizar la cita."
            });
        }
    }
);

// PATCH /api/citas/:id/estado
router.patch(
    "/api/citas/:id/estado",
    requiereSesion,
    requiereRoles("administrador", "vendedor"),
    async (req, res) => {
        try {
            const citaId = validarId(req.params.id);
            const estado = String(req.body?.estado || "").trim();

            if (!citaId) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El identificador no es válido."
                });
            }

            if (!ESTADOS.includes(estado)) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El estado indicado no es válido."
                });
            }

            const pool = await obtenerConexion();

            if (!(await comprobarTabla(pool, res))) return;

            const resultado = await pool.request()
                .input("id", sql.Int, citaId)
                .input("estado", sql.NVarChar(30), estado)
                .query(`
                    UPDATE dbo.Citas
                    SET Estado = @estado,
                        FechaActualizacion = SYSDATETIME()
                    WHERE CitaId = @id;

                    SELECT @@ROWCOUNT AS FilasAfectadas;
                `);

            if (!resultado.recordset[0].FilasAfectadas) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "La cita no existe."
                });
            }

            await registrarAuditoria(pool, {
                usuarioId: obtenerUsuarioId(req),
                accion: "CAMBIAR_ESTADO_CITA",
                tablaAfectada: "Citas",
                registroId: citaId,
                detalle: `Nuevo estado: ${estado}.`,
                ip: req.ip
            });

            return res.json({
                ok: true,
                mensaje: "Estado de la cita actualizado correctamente."
            });
        } catch (error) {
            console.error("Error cambiando estado de la cita:", error.message);

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible actualizar el estado de la cita."
            });
        }
    }
);

module.exports = router;
