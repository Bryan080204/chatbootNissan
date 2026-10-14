
"use strict";

const express = require("express");
const router = express.Router();

const { sql, obtenerConexion } = require("../config/database");
const { requiereSesion } = require("../middleware/auth");

// Los datos de los "clientes" viven en Conversaciones
// (NombreCliente, TelefonoCliente, CorreoCliente). No existe una tabla
// Clientes separada, por lo que aquí se agrupan por cliente.

// GET /api/clientes?buscar=
router.get(
    "/api/clientes",
    requiereSesion,
    async (req, res) => {
        try {
            const pool = await obtenerConexion();
            const request = pool.request();

            const buscar = String(req.query.buscar || "").trim();
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

            const where = filtros.length
                ? `WHERE ${filtros.join(" AND ")}`
                : "";

            const resultado = await request.query(`
                WITH base AS (
                    SELECT
                        c.ConversacionId,
                        c.NombreCliente,
                        c.CorreoCliente,
                        c.TelefonoCliente,
                        c.FechaInicio,
                        COALESCE(
                            NULLIF(c.TelefonoCliente, ''),
                            NULLIF(c.CorreoCliente, ''),
                            NULLIF(c.NombreCliente, ''),
                            CONCAT('Conversacion ', c.ConversacionId)
                        ) AS Clave
                    FROM dbo.Conversaciones AS c
                    ${where}
                )
                SELECT
                    b.Clave,
                    MAX(b.NombreCliente) AS Nombre,
                    MAX(b.TelefonoCliente) AS Telefono,
                    MAX(b.CorreoCliente) AS Correo,
                    COUNT_BIG(DISTINCT b.ConversacionId) AS Conversaciones,
                    (
                        SELECT COUNT_BIG(*)
                        FROM dbo.Mensajes AS m
                        WHERE m.ConversacionId IN (
                            SELECT x.ConversacionId
                            FROM base AS x
                            WHERE x.Clave = b.Clave
                        )
                    ) AS Mensajes,
                    MIN(b.FechaInicio) AS FechaRegistro,
                    MAX(b.FechaInicio) AS UltimaActividad
                FROM base AS b
                GROUP BY b.Clave
                ORDER BY MAX(b.FechaInicio) DESC;
            `);

            return res.json({
                ok: true,
                total: resultado.recordset.length,
                clientes: resultado.recordset
            });
        } catch (error) {
            console.error("Error consultando clientes:", error.message);

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible consultar los clientes."
            });
        }
    }
);

module.exports = router;
