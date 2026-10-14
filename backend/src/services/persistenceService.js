
"use strict";

const { sql, obtenerConexion } = require("../config/database");

// Guarda en SQL Server la conversación y los mensajes (cliente y bot).
// Es una mejora aditiva: si falla, solo se registra en consola y NUNCA
// afecta la respuesta que ya se envió al cliente.

async function obtenerOCrearConversacion(pool, numero, nombreCliente) {
    const existente = await pool.request()
        .input("telefono", sql.NVarChar(30), numero)
        .query(`
            SELECT TOP 1 ConversacionId
            FROM dbo.Conversaciones
            WHERE TelefonoCliente = @telefono
              AND Estado = 'Activa'
            ORDER BY FechaInicio DESC;
        `);

    if (existente.recordset.length) {
        return existente.recordset[0].ConversacionId;
    }

    const creada = await pool.request()
        .input("telefono", sql.NVarChar(30), numero)
        .input(
            "nombre",
            sql.NVarChar(150),
            nombreCliente ? String(nombreCliente).slice(0, 150) : null
        )
        .query(`
            INSERT INTO dbo.Conversaciones (
                UsuarioId,
                NombreCliente,
                CorreoCliente,
                TelefonoCliente,
                Canal,
                Estado,
                FechaInicio
            )
            OUTPUT INSERTED.ConversacionId
            VALUES (
                NULL,
                @nombre,
                NULL,
                @telefono,
                'WhatsApp',
                'Activa',
                SYSDATETIME()
            );
        `);

    return creada.recordset[0].ConversacionId;
}

async function guardarIntercambio({
    numero,
    nombreCliente = null,
    textoUsuario,
    textoAsistente,
    intencion = null
}) {
    if (!numero || !textoUsuario) {
        return;
    }

    try {
        const pool = await obtenerConexion();
        const conversacionId = await obtenerOCrearConversacion(
            pool,
            numero,
            nombreCliente
        );

        await pool.request()
            .input("conversacionId", sql.BigInt, conversacionId)
            .input("contenido", sql.NVarChar(sql.MAX), String(textoUsuario))
            .query(`
                INSERT INTO dbo.Mensajes (
                    ConversacionId,
                    Emisor,
                    Contenido,
                    FechaMensaje,
                    IntencionDetectada,
                    FueExitoso
                )
                VALUES (
                    @conversacionId,
                    'usuario',
                    @contenido,
                    SYSDATETIME(),
                    NULL,
                    NULL
                );
            `);

        if (textoAsistente) {
            await pool.request()
                .input("conversacionId", sql.BigInt, conversacionId)
                .input("contenido", sql.NVarChar(sql.MAX), String(textoAsistente))
                .input(
                    "intencion",
                    sql.NVarChar(100),
                    intencion ? String(intencion).slice(0, 100) : null
                )
                .query(`
                    INSERT INTO dbo.Mensajes (
                        ConversacionId,
                        Emisor,
                        Contenido,
                        FechaMensaje,
                        IntencionDetectada,
                        FueExitoso
                    )
                    VALUES (
                        @conversacionId,
                        'asistente',
                        @contenido,
                        SYSDATETIME(),
                        @intencion,
                        1
                    );
                `);
        }
    } catch (error) {
        console.error(
            "No fue posible guardar la conversación en la base de datos:",
            error.message
        );
    }
}

module.exports = {
    guardarIntercambio
};
