
"use strict";

const express = require("express");
const router = express.Router();

const { sql, obtenerConexion } = require("../config/database");
const { requiereSesion } = require("../middleware/auth");

function validarId(valor) {
    const id = Number(valor);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// GET /api/conversaciones/opciones
// Devuelve los estados y canales realmente usados, para no inventarlos.
router.get(
    "/api/conversaciones/opciones",
    requiereSesion,
    async (req, res) => {
        try {
            const pool = await obtenerConexion();

            const resultado = await pool.request().query(`
                SELECT DISTINCT Estado FROM dbo.Conversaciones
                WHERE Estado IS NOT NULL;

                SELECT DISTINCT Canal FROM dbo.Conversaciones
                WHERE Canal IS NOT NULL;
            `);

            return res.json({
                ok: true,
                estados: (resultado.recordsets[0] || []).map((f) => f.Estado),
                canales: (resultado.recordsets[1] || []).map((f) => f.Canal)
            });
        } catch (error) {
            console.error("Error consultando opciones:", error.message);

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible consultar las opciones."
            });
        }
    }
);

// GET /api/conversaciones?buscar=&estado=&canal=&telefono=&pagina=&porPagina=
router.get(
    "/api/conversaciones",
    requiereSesion,
    async (req, res) => {
        try {
            const pool = await obtenerConexion();
            const request = pool.request();

            const buscar = String(req.query.buscar || "").trim();
            const estado = String(req.query.estado || "").trim();
            const canal = String(req.query.canal || "").trim();
            const telefono = String(req.query.telefono || "").trim();

            const porPagina = Math.min(
                Math.max(Number(req.query.porPagina) || 25, 1),
                200
            );
            const pagina = Math.max(Number(req.query.pagina) || 1, 1);
            const offset = (pagina - 1) * porPagina;

            const filtros = [];

            if (buscar) {
                request.input("buscar", sql.NVarChar(150), `%${buscar}%`);
                filtros.push(`
                    (
                        c.NombreCliente LIKE @buscar
                        OR c.TelefonoCliente LIKE @buscar
                        OR c.CorreoCliente LIKE @buscar
                    )
                `);
            }

            if (estado) {
                request.input("estado", sql.NVarChar(30), estado);
                filtros.push("c.Estado = @estado");
            }

            if (canal) {
                request.input("canal", sql.NVarChar(30), canal);
                filtros.push("c.Canal = @canal");
            }

            if (telefono) {
                request.input("telefono", sql.NVarChar(30), telefono);
                filtros.push("c.TelefonoCliente = @telefono");
            }

            const where = filtros.length
                ? `WHERE ${filtros.join(" AND ")}`
                : "";

            request.input("offset", sql.Int, offset);
            request.input("limite", sql.Int, porPagina);

            const resultado = await request.query(`
                SELECT
                    c.ConversacionId,
                    c.NombreCliente,
                    c.TelefonoCliente,
                    c.CorreoCliente,
                    c.Canal,
                    c.Estado,
                    c.FechaInicio,
                    c.FechaFin,
                    (
                        SELECT COUNT_BIG(*)
                        FROM dbo.Mensajes AS m
                        WHERE m.ConversacionId = c.ConversacionId
                    ) AS TotalMensajes,
                    COUNT_BIG(*) OVER() AS TotalRegistros
                FROM dbo.Conversaciones AS c
                ${where}
                ORDER BY c.FechaInicio DESC
                OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY;
            `);

            const total = resultado.recordset.length
                ? Number(resultado.recordset[0].TotalRegistros)
                : 0;

            return res.json({
                ok: true,
                total,
                pagina,
                porPagina,
                conversaciones: resultado.recordset
            });
        } catch (error) {
            console.error(
                "Error consultando conversaciones:",
                error.message
            );

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible consultar las conversaciones."
            });
        }
    }
);

// GET /api/conversaciones/:id/mensajes
router.get(
    "/api/conversaciones/:id/mensajes",
    requiereSesion,
    async (req, res) => {
        try {
            const conversacionId = validarId(req.params.id);

            if (!conversacionId) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El identificador no es válido."
                });
            }

            const pool = await obtenerConexion();

            const conversacion = await pool.request()
                .input("id", sql.BigInt, conversacionId)
                .query(`
                    SELECT
                        ConversacionId,
                        NombreCliente,
                        TelefonoCliente,
                        CorreoCliente,
                        Canal,
                        Estado,
                        FechaInicio,
                        FechaFin
                    FROM dbo.Conversaciones
                    WHERE ConversacionId = @id;
                `);

            if (!conversacion.recordset.length) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "La conversación no existe."
                });
            }

            const mensajes = await pool.request()
                .input("id", sql.BigInt, conversacionId)
                .query(`
                    SELECT
                        MensajeId,
                        Emisor,
                        Contenido,
                        FechaMensaje,
                        IntencionDetectada,
                        FueExitoso
                    FROM dbo.Mensajes
                    WHERE ConversacionId = @id
                    ORDER BY FechaMensaje ASC, MensajeId ASC;
                `);

            return res.json({
                ok: true,
                conversacion: conversacion.recordset[0],
                mensajes: mensajes.recordset
            });
        } catch (error) {
            console.error("Error consultando mensajes:", error.message);

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible consultar los mensajes."
            });
        }
    }
);

module.exports = router;
