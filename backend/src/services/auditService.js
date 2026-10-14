
"use strict";

const { sql } = require("../config/database");

// Registra un evento en la tabla Auditoria.
// Nunca lanza error hacia el flujo principal: si la auditoría falla,
// se registra en consola pero la operación de negocio continúa.
async function registrarAuditoria(pool, datos) {
    try {
        const {
            usuarioId = null,
            accion,
            tablaAfectada = null,
            registroId = null,
            detalle = null,
            ip = null
        } = datos || {};

        if (!accion) {
            return;
        }

        await pool.request()
            .input("usuarioId", sql.BigInt, usuarioId)
            .input("accion", sql.NVarChar(100), String(accion).slice(0, 100))
            .input(
                "tablaAfectada",
                sql.NVarChar(100),
                tablaAfectada ? String(tablaAfectada).slice(0, 100) : null
            )
            .input(
                "registroId",
                sql.NVarChar(100),
                registroId != null ? String(registroId).slice(0, 100) : null
            )
            .input(
                "detalle",
                sql.NVarChar(sql.MAX),
                detalle != null ? String(detalle) : null
            )
            .input(
                "ip",
                sql.NVarChar(45),
                ip ? String(ip).slice(0, 45) : null
            )
            .query(`
                INSERT INTO dbo.Auditoria (
                    UsuarioId,
                    Accion,
                    TablaAfectada,
                    RegistroId,
                    Detalle,
                    DireccionIP
                )
                VALUES (
                    @usuarioId,
                    @accion,
                    @tablaAfectada,
                    @registroId,
                    @detalle,
                    @ip
                );
            `);
    } catch (error) {
        console.error(
            "No fue posible guardar la auditoría:",
            error.message
        );
    }
}

module.exports = {
    registrarAuditoria
};
