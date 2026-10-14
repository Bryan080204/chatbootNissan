
"use strict";

const { sql, obtenerConexion } = require("../config/database");

// Registra un intento de acceso (inicio de sesión correcto, fallido o cierre
// de sesión) en dbo.IntentosAcceso. Nunca lanza error al flujo principal.
async function registrarIntentoAcceso({
    usuarioId = null,
    correo = null,
    exitoso = false,
    motivo = null,
    ip = null
}) {
    try {
        const pool = await obtenerConexion();

        await pool.request()
            .input("usuarioId", sql.BigInt, usuarioId)
            .input(
                "correo",
                sql.NVarChar(254),
                correo ? String(correo).slice(0, 254) : null
            )
            .input("exitoso", sql.Bit, exitoso ? 1 : 0)
            .input(
                "motivo",
                sql.NVarChar(250),
                motivo ? String(motivo).slice(0, 250) : null
            )
            .input("ip", sql.NVarChar(45), ip ? String(ip).slice(0, 45) : null)
            .query(`
                INSERT INTO dbo.IntentosAcceso (
                    UsuarioId,
                    CorreoIntentado,
                    Exitoso,
                    Motivo,
                    DireccionIP,
                    FechaIntento
                )
                VALUES (
                    @usuarioId,
                    @correo,
                    @exitoso,
                    @motivo,
                    @ip,
                    SYSDATETIME()
                );
            `);
    } catch (error) {
        console.error(
            "No fue posible registrar el intento de acceso:",
            error.message
        );
    }
}

module.exports = {
    registrarIntentoAcceso
};
