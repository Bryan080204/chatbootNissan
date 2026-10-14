
"use strict";

const { obtenerConexion } = require("../config/database");

// Comprueba si una tabla existe en el esquema actual.
async function tablaExiste(pool, nombreTabla) {
    const resultado = await pool.request()
        .input("tabla", nombreTabla)
        .query(`
            SELECT OBJECT_ID('dbo.' + @tabla, 'U') AS ObjectId;
        `);

    return Boolean(resultado.recordset[0]?.ObjectId);
}

// Genera la lista de los últimos 7 días, incluidos los días sin registros.
async function obtenerMensajesPorDia(pool) {
    const resultado = await pool.request().query(`
        ;WITH dias AS (
            SELECT CAST(DATEADD(day, -n, CAST(SYSDATETIME() AS date)) AS date) AS Dia
            FROM (VALUES (0),(1),(2),(3),(4),(5),(6)) AS v(n)
        )
        SELECT
            CONVERT(varchar(10), d.Dia, 23) AS Dia,
            COUNT_BIG(m.MensajeId) AS Total
        FROM dias AS d
        LEFT JOIN dbo.Mensajes AS m
            ON CAST(m.FechaMensaje AS date) = d.Dia
        GROUP BY d.Dia
        ORDER BY d.Dia;
    `);

    return resultado.recordset.map((fila) => ({
        etiqueta: fila.Dia,
        total: Number(fila.Total)
    }));
}

async function obtenerConversacionesPorDia(pool) {
    const resultado = await pool.request().query(`
        ;WITH dias AS (
            SELECT CAST(DATEADD(day, -n, CAST(SYSDATETIME() AS date)) AS date) AS Dia
            FROM (VALUES (0),(1),(2),(3),(4),(5),(6)) AS v(n)
        )
        SELECT
            CONVERT(varchar(10), d.Dia, 23) AS Dia,
            COUNT_BIG(c.ConversacionId) AS Total
        FROM dias AS d
        LEFT JOIN dbo.Conversaciones AS c
            ON CAST(c.FechaInicio AS date) = d.Dia
        GROUP BY d.Dia
        ORDER BY d.Dia;
    `);

    return resultado.recordset.map((fila) => ({
        etiqueta: fila.Dia,
        total: Number(fila.Total)
    }));
}

async function obtenerMensajesPorHora(pool) {
    const resultado = await pool.request().query(`
        SELECT
            DATEPART(hour, FechaMensaje) AS Hora,
            COUNT_BIG(*) AS Total
        FROM dbo.Mensajes
        GROUP BY DATEPART(hour, FechaMensaje);
    `);

    const mapa = new Map(
        resultado.recordset.map((fila) => [
            Number(fila.Hora),
            Number(fila.Total)
        ])
    );

    return Array.from({ length: 24 }, (_, hora) => ({
        etiqueta: String(hora).padStart(2, "0") + ":00",
        total: mapa.get(hora) || 0
    }));
}

async function obtenerInventarioPorModelo(pool) {
    const resultado = await pool.request().query(`
        SELECT
            M.Nombre AS Modelo,
            COUNT_BIG(V.VehiculoId) AS Total,
            ISNULL(SUM(V.Existencia), 0) AS Existencia
        FROM dbo.Modelos AS M
        LEFT JOIN dbo.Vehiculos AS V
            ON V.ModeloId = M.ModeloId
           AND V.Activo = 1
        GROUP BY M.Nombre
        ORDER BY M.Nombre;
    `);

    return resultado.recordset.map((fila) => ({
        etiqueta: fila.Modelo,
        total: Number(fila.Total),
        existencia: Number(fila.Existencia)
    }));
}

async function obtenerVehiculosPorDisponibilidad(pool) {
    const resultado = await pool.request().query(`
        SELECT
            Estado,
            COUNT_BIG(*) AS Total
        FROM dbo.Vehiculos
        WHERE Activo = 1
        GROUP BY Estado
        ORDER BY Estado;
    `);

    return resultado.recordset.map((fila) => ({
        etiqueta: fila.Estado,
        total: Number(fila.Total)
    }));
}

async function obtenerCitasPorEstado(pool) {
    const resultado = await pool.request().query(`
        SELECT Estado, COUNT_BIG(*) AS Total
        FROM dbo.Citas
        GROUP BY Estado
        ORDER BY Estado;
    `);

    return resultado.recordset.map((fila) => ({
        etiqueta: fila.Estado,
        total: Number(fila.Total)
    }));
}

async function obtenerActividadReciente(pool, incluirCitas) {
    const selectCitas = incluirCitas
        ? `UNION ALL
           SELECT
               'cita' AS Tipo,
               'Cita ' + c.Estado AS Titulo,
               LEFT(ISNULL(c.NombreCliente, '') + ' · ' + ISNULL(c.Servicio, ''), 160) AS Detalle,
               c.FechaCreacion AS Fecha
           FROM dbo.Citas AS c`
        : "";

    const resultado = await pool.request().query(`
        SELECT TOP 12 Tipo, Titulo, Detalle, Fecha
        FROM (
            SELECT
                'mensaje' AS Tipo,
                'Mensaje ' + m.Emisor AS Titulo,
                LEFT(m.Contenido, 160) AS Detalle,
                m.FechaMensaje AS Fecha
            FROM dbo.Mensajes AS m
            UNION ALL
            SELECT
                'acceso' AS Tipo,
                CASE WHEN i.Exitoso = 1
                     THEN 'Acceso registrado'
                     ELSE 'Acceso fallido' END AS Titulo,
                LEFT(ISNULL(i.CorreoIntentado, '') + ' ' + ISNULL(i.Motivo, ''), 160) AS Detalle,
                i.FechaIntento AS Fecha
            FROM dbo.IntentosAcceso AS i
            UNION ALL
            SELECT
                'auditoria' AS Tipo,
                a.Accion AS Titulo,
                LEFT(ISNULL(a.Detalle, ''), 160) AS Detalle,
                a.FechaAccion AS Fecha
            FROM dbo.Auditoria AS a
            ${selectCitas}
        ) AS actividad
        WHERE Fecha IS NOT NULL
        ORDER BY Fecha DESC;
    `);

    return resultado.recordset.map((fila) => ({
        tipo: fila.Tipo,
        titulo: fila.Titulo,
        detalle: fila.Detalle,
        fecha: fila.Fecha
    }));
}

async function obtenerResumen(pool, incluirCitas) {
    const resultado = await pool.request().query(`
        SELECT
            (SELECT COUNT_BIG(DISTINCT TelefonoCliente)
               FROM dbo.Conversaciones
              WHERE TelefonoCliente IS NOT NULL AND TelefonoCliente <> '') AS Clientes,
            (SELECT COUNT_BIG(*) FROM dbo.Conversaciones) AS Conversaciones,
            (SELECT COUNT_BIG(*) FROM dbo.Mensajes) AS Mensajes,
            (SELECT COUNT_BIG(*) FROM dbo.Vehiculos) AS VehiculosTotal,
            (SELECT COUNT_BIG(*) FROM dbo.Vehiculos
              WHERE Activo = 1 AND Estado = 'Disponible') AS VehiculosDisponibles,
            (SELECT COUNT_BIG(*) FROM dbo.Vehiculos
              WHERE Activo = 0) AS VehiculosInactivos,
            (SELECT ISNULL(SUM(Existencia), 0) FROM dbo.Vehiculos
              WHERE Activo = 1) AS ExistenciaTotal,
            (SELECT COUNT_BIG(*) FROM dbo.Usuarios
              WHERE Activo = 1) AS UsuariosActivos,
            (SELECT COUNT_BIG(*) FROM dbo.IntentosAcceso
              WHERE FechaIntento >= DATEADD(day, -7, SYSDATETIME())) AS IntentosRecientes;
    `);

    const resumen = resultado.recordset[0] || {};

    let citas = {
        total: 0,
        pendientes: 0,
        confirmadas: 0,
        canceladas: 0,
        completadas: 0
    };

    if (incluirCitas) {
        const resultadoCitas = await pool.request().query(`
            SELECT
                COUNT_BIG(*) AS Total,
                SUM(CASE WHEN Estado = 'Pendiente' THEN 1 ELSE 0 END) AS Pendientes,
                SUM(CASE WHEN Estado = 'Confirmada' THEN 1 ELSE 0 END) AS Confirmadas,
                SUM(CASE WHEN Estado = 'Cancelada' THEN 1 ELSE 0 END) AS Canceladas,
                SUM(CASE WHEN Estado = 'Completada' THEN 1 ELSE 0 END) AS Completadas
            FROM dbo.Citas;
        `);

        const fila = resultadoCitas.recordset[0] || {};

        citas = {
            total: Number(fila.Total || 0),
            pendientes: Number(fila.Pendientes || 0),
            confirmadas: Number(fila.Confirmadas || 0),
            canceladas: Number(fila.Canceladas || 0),
            completadas: Number(fila.Completadas || 0)
        };
    }

    return {
        clientes: Number(resumen.Clientes || 0),
        conversaciones: Number(resumen.Conversaciones || 0),
        mensajes: Number(resumen.Mensajes || 0),
        vehiculos: {
            total: Number(resumen.VehiculosTotal || 0),
            disponibles: Number(resumen.VehiculosDisponibles || 0),
            inactivos: Number(resumen.VehiculosInactivos || 0),
            existencia: Number(resumen.ExistenciaTotal || 0)
        },
        usuariosActivos: Number(resumen.UsuariosActivos || 0),
        intentosRecientes: Number(resumen.IntentosRecientes || 0),
        citas
    };
}

async function obtenerDashboard() {
    const pool = await obtenerConexion();
    const incluirCitas = await tablaExiste(pool, "Citas");

    const [
        resumen,
        mensajesPorDia,
        mensajesPorHora,
        conversacionesPorDia,
        inventarioPorModelo,
        vehiculosPorDisponibilidad,
        actividadReciente
    ] = await Promise.all([
        obtenerResumen(pool, incluirCitas),
        obtenerMensajesPorDia(pool),
        obtenerMensajesPorHora(pool),
        obtenerConversacionesPorDia(pool),
        obtenerInventarioPorModelo(pool),
        obtenerVehiculosPorDisponibilidad(pool),
        obtenerActividadReciente(pool, incluirCitas)
    ]);

    const citasPorEstado = incluirCitas
        ? await obtenerCitasPorEstado(pool)
        : [];

    return {
        resumen,
        graficas: {
            mensajesPorDia,
            mensajesPorHora,
            conversacionesPorDia,
            citasPorEstado,
            inventarioPorModelo,
            vehiculosPorDisponibilidad
        },
        actividadReciente,
        citasDisponibles: incluirCitas,
        generadoEn: new Date().toISOString()
    };
}

module.exports = {
    tablaExiste,
    obtenerDashboard
};
