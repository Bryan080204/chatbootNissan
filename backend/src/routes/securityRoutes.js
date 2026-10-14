
"use strict";

const express = require("express");
const router = express.Router();

const { sql, obtenerConexion } = require("../config/database");
const {
    requiereSesion,
    requiereAdministrador
} = require("../middleware/auth");

function filtroFechas(request, req, columna, filtros) {
    const desde = String(req.query.desde || "").trim();
    const hasta = String(req.query.hasta || "").trim();

    if (desde) {
        const f = new Date(desde);
        if (!Number.isNaN(f.getTime())) {
            request.input("desde", sql.DateTime2, f);
            filtros.push(`${columna} >= @desde`);
        }
    }

    if (hasta) {
        const f = new Date(hasta);
        if (!Number.isNaN(f.getTime())) {
            request.input("hasta", sql.DateTime2, f);
            filtros.push(`${columna} <= @hasta`);
        }
    }
}

// GET /api/seguridad/intentos?resultado=exitoso|fallido&buscar=&desde=&hasta=
router.get(
    "/api/seguridad/intentos",
    requiereSesion,
    requiereAdministrador,
    async (req, res) => {
        try {
            const pool = await obtenerConexion();
            const request = pool.request();
            const buscar = String(req.query.buscar || "").trim();
            const resultado = String(req.query.resultado || "").trim().toLowerCase();
            const filtros = [];

            if (buscar) {
                request.input("buscar", sql.NVarChar(150), `%${buscar}%`);
                filtros.push(`
                    (i.CorreoIntentado LIKE @buscar
                     OR i.Motivo LIKE @buscar
                     OR i.DireccionIP LIKE @buscar
                     OR u.Nombre LIKE @buscar)
                `);
            }

            if (resultado === "exitoso") {
                filtros.push("i.Exitoso = 1");
            } else if (resultado === "fallido") {
                filtros.push("i.Exitoso = 0");
            }

            filtroFechas(request, req, "i.FechaIntento", filtros);

            const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

            const consulta = await request.query(`
                SELECT TOP 300
                    i.IntentoAccesoId,
                    i.UsuarioId,
                    u.Nombre AS Usuario,
                    i.CorreoIntentado,
                    i.Exitoso,
                    i.Motivo,
                    i.DireccionIP,
                    i.FechaIntento
                FROM dbo.IntentosAcceso AS i
                LEFT JOIN dbo.Usuarios AS u ON u.UsuarioId = i.UsuarioId
                ${where}
                ORDER BY i.FechaIntento DESC;
            `);

            return res.json({
                ok: true,
                total: consulta.recordset.length,
                intentos: consulta.recordset
            });
        } catch (error) {
            console.error("Error consultando intentos:", error.message);
            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible consultar los intentos de acceso."
            });
        }
    }
);

// GET /api/seguridad/auditoria?buscar=&accion=&desde=&hasta=
router.get(
    "/api/seguridad/auditoria",
    requiereSesion,
    requiereAdministrador,
    async (req, res) => {
        try {
            const pool = await obtenerConexion();
            const request = pool.request();
            const buscar = String(req.query.buscar || "").trim();
            const accion = String(req.query.accion || "").trim();
            const filtros = [];

            if (buscar) {
                request.input("buscar", sql.NVarChar(150), `%${buscar}%`);
                filtros.push(`
                    (a.Detalle LIKE @buscar
                     OR a.TablaAfectada LIKE @buscar
                     OR a.RegistroId LIKE @buscar
                     OR u.Nombre LIKE @buscar)
                `);
            }

            if (accion) {
                request.input("accion", sql.NVarChar(100), accion);
                filtros.push("a.Accion = @accion");
            }

            filtroFechas(request, req, "a.FechaAccion", filtros);

            const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

            const consulta = await request.query(`
                SELECT TOP 300
                    a.AuditoriaId,
                    a.UsuarioId,
                    u.Nombre AS Usuario,
                    a.Accion,
                    a.TablaAfectada,
                    a.RegistroId,
                    a.Detalle,
                    a.DireccionIP,
                    a.FechaAccion
                FROM dbo.Auditoria AS a
                LEFT JOIN dbo.Usuarios AS u ON u.UsuarioId = a.UsuarioId
                ${where}
                ORDER BY a.FechaAccion DESC;
            `);

            const acciones = await pool.request().query(`
                SELECT DISTINCT Accion FROM dbo.Auditoria
                WHERE Accion IS NOT NULL ORDER BY Accion;
            `);

            return res.json({
                ok: true,
                total: consulta.recordset.length,
                acciones: acciones.recordset.map((f) => f.Accion),
                eventos: consulta.recordset
            });
        } catch (error) {
            console.error("Error consultando auditoría:", error.message);
            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible consultar la auditoría."
            });
        }
    }
);

module.exports = router;
