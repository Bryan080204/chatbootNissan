
"use strict";

const express = require("express");
const router = express.Router();

const { sql, obtenerConexion } = require("../config/database");
const {
    requiereSesion,
    esAdministrador
} = require("../middleware/auth");
const { tablaExiste } = require("../services/dashboardService");

const TIPOS = ["mensajes", "citas", "accesos", "auditoria"];

function construirFiltroFechas(request, req, columna) {
    const desde = String(req.query.desde || "").trim();
    const hasta = String(req.query.hasta || "").trim();
    const filtros = [];

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

    return filtros;
}

// GET /api/historial?tipo=mensajes|citas|accesos|auditoria&buscar=&desde=&hasta=
router.get(
    "/api/historial",
    requiereSesion,
    async (req, res) => {
        try {
            const tipo = String(req.query.tipo || "mensajes").trim();

            if (!TIPOS.includes(tipo)) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El tipo de historial no es válido."
                });
            }

            // Los historiales administrativos solo los ve un administrador.
            if (
                (tipo === "accesos" || tipo === "auditoria") &&
                !esAdministrador(req)
            ) {
                return res.status(403).json({
                    ok: false,
                    mensaje: "No tienes permisos para consultar este historial."
                });
            }

            const pool = await obtenerConexion();
            const request = pool.request();
            const buscar = String(req.query.buscar || "").trim();
            const filtros = [];

            let consulta = "";

            if (tipo === "mensajes") {
                if (buscar) {
                    request.input("buscar", sql.NVarChar(150), `%${buscar}%`);
                    filtros.push("m.Contenido LIKE @buscar");
                }
                filtros.push(...construirFiltroFechas(request, req, "m.FechaMensaje"));

                const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

                consulta = `
                    SELECT TOP 200
                        'mensaje' AS Tipo,
                        m.Emisor AS Emisor,
                        c.NombreCliente AS Cliente,
                        m.Contenido AS Detalle,
                        m.IntencionDetectada AS Referencia,
                        m.FechaMensaje AS Fecha
                    FROM dbo.Mensajes AS m
                    INNER JOIN dbo.Conversaciones AS c
                        ON c.ConversacionId = m.ConversacionId
                    ${where}
                    ORDER BY m.FechaMensaje DESC;
                `;
            }

            if (tipo === "citas") {
                if (!(await tablaExiste(pool, "Citas"))) {
                    return res.json({ ok: true, tipo, eventos: [], disponible: false });
                }

                if (buscar) {
                    request.input("buscar", sql.NVarChar(150), `%${buscar}%`);
                    filtros.push("c.NombreCliente LIKE @buscar");
                }
                filtros.push(...construirFiltroFechas(request, req, "c.FechaCita"));

                const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

                consulta = `
                    SELECT TOP 200
                        'cita' AS Tipo,
                        c.Estado AS Emisor,
                        c.NombreCliente AS Cliente,
                        c.Servicio AS Detalle,
                        c.Estado AS Referencia,
                        c.FechaCita AS Fecha
                    FROM dbo.Citas AS c
                    ${where}
                    ORDER BY c.FechaCita DESC;
                `;
            }

            if (tipo === "accesos") {
                if (buscar) {
                    request.input("buscar", sql.NVarChar(150), `%${buscar}%`);
                    filtros.push("(i.CorreoIntentado LIKE @buscar OR i.Motivo LIKE @buscar)");
                }
                filtros.push(...construirFiltroFechas(request, req, "i.FechaIntento"));

                const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

                consulta = `
                    SELECT TOP 200
                        'acceso' AS Tipo,
                        CASE WHEN i.Exitoso = 1 THEN 'Exitoso' ELSE 'Fallido' END AS Emisor,
                        ISNULL(u.Nombre, ISNULL(i.CorreoIntentado, 'Desconocido')) AS Cliente,
                        ISNULL(i.Motivo, '') AS Detalle,
                        ISNULL(i.DireccionIP, '') AS Referencia,
                        i.FechaIntento AS Fecha
                    FROM dbo.IntentosAcceso AS i
                    LEFT JOIN dbo.Usuarios AS u
                        ON u.UsuarioId = i.UsuarioId
                    ${where}
                    ORDER BY i.FechaIntento DESC;
                `;
            }

            if (tipo === "auditoria") {
                if (buscar) {
                    request.input("buscar", sql.NVarChar(150), `%${buscar}%`);
                    filtros.push("(a.Accion LIKE @buscar OR a.Detalle LIKE @buscar)");
                }
                filtros.push(...construirFiltroFechas(request, req, "a.FechaAccion"));

                const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

                consulta = `
                    SELECT TOP 200
                        'auditoria' AS Tipo,
                        a.Accion AS Emisor,
                        ISNULL(u.Nombre, 'Sistema') AS Cliente,
                        ISNULL(a.Detalle, '') AS Detalle,
                        ISNULL(a.TablaAfectada, '') AS Referencia,
                        a.FechaAccion AS Fecha
                    FROM dbo.Auditoria AS a
                    LEFT JOIN dbo.Usuarios AS u
                        ON u.UsuarioId = a.UsuarioId
                    ${where}
                    ORDER BY a.FechaAccion DESC;
                `;
            }

            const resultado = await request.query(consulta);

            return res.json({
                ok: true,
                tipo,
                disponible: true,
                eventos: resultado.recordset
            });
        } catch (error) {
            console.error("Error consultando historial:", error.message);

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible consultar el historial."
            });
        }
    }
);

module.exports = router;
