
"use strict";

const express = require("express");
const router = express.Router();

const { sql, obtenerConexion } = require("../config/database");

const {
    requiereSesion,
    requiereAdministrador,
    obtenerUsuarioId
} = require("../middleware/auth");

const { registrarAuditoria } = require("../services/auditService");

const ESTADOS = [
    "Disponible",
    "Apartado",
    "Vendido",
    "Mantenimiento"
];

function validarId(valor) {
    const id = Number(valor);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validarVehiculo(datos) {
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
        return "Los datos enviados no son válidos.";
    }

    const modeloId = Number(datos.ModeloId);
    const anio = Number(datos.Anio);
    const precio = Number(datos.Precio);
    const existencia = Number(datos.Existencia);

    if (!Number.isInteger(modeloId) || modeloId <= 0) {
        return "Selecciona un modelo válido.";
    }

    if (!Number.isInteger(anio) || anio < 1900 || anio > 2100) {
        return "El año debe estar entre 1900 y 2100.";
    }

    if (
        datos.Precio === "" ||
        datos.Precio === null ||
        !Number.isFinite(precio) ||
        precio < 0 ||
        precio > 9999999999.99
    ) {
        return "El precio debe ser un número válido y no negativo.";
    }

    if (
        datos.Existencia === "" ||
        datos.Existencia === null ||
        !Number.isInteger(existencia) ||
        existencia < 0
    ) {
        return "La existencia debe ser un entero igual o mayor que cero.";
    }

    if (
        datos.Version != null &&
        String(datos.Version).trim().length > 100
    ) {
        return "La versión no puede superar los 100 caracteres.";
    }

    if (
        datos.Color != null &&
        String(datos.Color).trim().length > 50
    ) {
        return "El color no puede superar los 50 caracteres.";
    }

    if (!ESTADOS.includes(datos.Estado)) {
        return "Selecciona un estado válido.";
    }

    return null;
}

function textoOpcional(valor) {
    if (valor == null) return null;

    const texto = String(valor).trim();
    return texto || null;
}

// GET /api/inventario/modelos
router.get(
    "/api/inventario/modelos",
    requiereSesion,
    async (req, res) => {
        try {
            const pool = await obtenerConexion();

            const resultado = await pool.request().query(`
                SELECT ModeloId, Nombre
                FROM dbo.Modelos
                WHERE Activo = 1
                ORDER BY Nombre;
            `);

            return res.json({
                ok: true,
                modelos: resultado.recordset
            });
        } catch (error) {
            console.error("Error consultando modelos:", error.message);

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible consultar los modelos."
            });
        }
    }
);

// GET /api/inventario?buscar=Versa&estado=Disponible&activo=1
router.get(
    "/api/inventario",
    requiereSesion,
    async (req, res) => {
        try {
            const pool = await obtenerConexion();
            const request = pool.request();

            const buscar = String(req.query.buscar || "").trim();
            const estado = String(req.query.estado || "").trim();
            const activo = String(req.query.activo ?? "").trim();

            const filtros = [];

            if (buscar) {
                request.input(
                    "buscar",
                    sql.NVarChar(150),
                    `%${buscar}%`
                );

                filtros.push(`
                    (
                        M.Nombre LIKE @buscar
                        OR V.Version LIKE @buscar
                        OR V.Color LIKE @buscar
                        OR CONVERT(NVARCHAR(4), V.Anio) LIKE @buscar
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
                filtros.push("V.Estado = @estado");
            }

            if (activo === "1" || activo === "0") {
                request.input("activo", sql.Bit, Number(activo));
                filtros.push("V.Activo = @activo");
            }

            const where = filtros.length
                ? `WHERE ${filtros.join(" AND ")}`
                : "";

            const resultado = await request.query(`
                SELECT
                    V.VehiculoId,
                    V.ModeloId,
                    M.Nombre AS Modelo,
                    V.Anio,
                    V.Version,
                    V.Color,
                    V.Precio,
                    V.Existencia,
                    V.Estado,
                    V.Activo,
                    V.FechaCreacion,
                    V.FechaActualizacion
                FROM dbo.Vehiculos AS V
                INNER JOIN dbo.Modelos AS M
                    ON M.ModeloId = V.ModeloId
                ${where}
                ORDER BY V.VehiculoId DESC;
            `);

            return res.json({
                ok: true,
                total: resultado.recordset.length,
                vehiculos: resultado.recordset
            });
        } catch (error) {
            console.error("Error consultando inventario:", error.message);

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible consultar el inventario."
            });
        }
    }
);

// POST /api/inventario
router.post(
    "/api/inventario",
    requiereSesion,
    requiereAdministrador,
    async (req, res) => {
        try {
            const datos = req.body;
            const errorValidacion = validarVehiculo(datos);

            if (errorValidacion) {
                return res.status(400).json({
                    ok: false,
                    mensaje: errorValidacion
                });
            }

            const pool = await obtenerConexion();

            const modelo = await pool.request()
                .input("modeloId", sql.Int, Number(datos.ModeloId))
                .query(`
                    SELECT ModeloId
                    FROM dbo.Modelos
                    WHERE ModeloId = @modeloId
                      AND Activo = 1;
                `);

            if (!modelo.recordset.length) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El modelo no existe o está inactivo."
                });
            }

            const resultado = await pool.request()
                .input("modeloId", sql.Int, Number(datos.ModeloId))
                .input("anio", sql.Int, Number(datos.Anio))
                .input("version", sql.NVarChar(100), textoOpcional(datos.Version))
                .input("color", sql.NVarChar(50), textoOpcional(datos.Color))
                .input("precio", sql.Decimal(12, 2), Number(datos.Precio))
                .input("existencia", sql.Int, Number(datos.Existencia))
                .input("estado", sql.NVarChar(30), datos.Estado)
                .query(`
                    INSERT INTO dbo.Vehiculos (
                        ModeloId,
                        Anio,
                        Version,
                        Color,
                        Precio,
                        Existencia,
                        Estado
                    )
                    OUTPUT INSERTED.VehiculoId
                    VALUES (
                        @modeloId,
                        @anio,
                        @version,
                        @color,
                        @precio,
                        @existencia,
                        @estado
                    );
                `);

            const nuevoId = resultado.recordset[0].VehiculoId;

            await registrarAuditoria(pool, {
                usuarioId: obtenerUsuarioId(req),
                accion: "CREAR_VEHICULO",
                tablaAfectada: "Vehiculos",
                registroId: nuevoId,
                detalle: `Se registró el vehículo con modelo ID ${datos.ModeloId}.`,
                ip: req.ip
            });

            return res.status(201).json({
                ok: true,
                mensaje: "Vehículo registrado correctamente.",
                vehiculoId: nuevoId
            });
        } catch (error) {
            console.error("Error registrando vehículo:", error.message);

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible registrar el vehículo."
            });
        }
    }
);

// PUT /api/inventario/:id
router.put(
    "/api/inventario/:id",
    requiereSesion,
    requiereAdministrador,
    async (req, res) => {
        try {
            const vehiculoId = validarId(req.params.id);

            if (!vehiculoId) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El identificador no es válido."
                });
            }

            const datos = req.body;
            const errorValidacion = validarVehiculo(datos);

            if (errorValidacion) {
                return res.status(400).json({
                    ok: false,
                    mensaje: errorValidacion
                });
            }

            const pool = await obtenerConexion();

            const modelo = await pool.request()
                .input("modeloId", sql.Int, Number(datos.ModeloId))
                .query(`
                    SELECT ModeloId
                    FROM dbo.Modelos
                    WHERE ModeloId = @modeloId
                      AND Activo = 1;
                `);

            if (!modelo.recordset.length) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El modelo no existe o está inactivo."
                });
            }

            const resultado = await pool.request()
                .input("id", sql.Int, vehiculoId)
                .input("modeloId", sql.Int, Number(datos.ModeloId))
                .input("anio", sql.Int, Number(datos.Anio))
                .input("version", sql.NVarChar(100), textoOpcional(datos.Version))
                .input("color", sql.NVarChar(50), textoOpcional(datos.Color))
                .input("precio", sql.Decimal(12, 2), Number(datos.Precio))
                .input("existencia", sql.Int, Number(datos.Existencia))
                .input("estado", sql.NVarChar(30), datos.Estado)
                .query(`
                    UPDATE dbo.Vehiculos
                    SET
                        ModeloId = @modeloId,
                        Anio = @anio,
                        Version = @version,
                        Color = @color,
                        Precio = @precio,
                        Existencia = @existencia,
                        Estado = @estado,
                        FechaActualizacion = SYSDATETIME()
                    WHERE VehiculoId = @id;

                    SELECT @@ROWCOUNT AS FilasAfectadas;
                `);

            if (!resultado.recordset[0].FilasAfectadas) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "El vehículo no existe."
                });
            }

            await registrarAuditoria(pool, {
                usuarioId: obtenerUsuarioId(req),
                accion: "EDITAR_VEHICULO",
                tablaAfectada: "Vehiculos",
                registroId: vehiculoId,
                detalle: "Se actualizaron los datos del vehículo.",
                ip: req.ip
            });

            return res.json({
                ok: true,
                mensaje: "Vehículo actualizado correctamente."
            });
        } catch (error) {
            console.error("Error actualizando vehículo:", error.message);

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible actualizar el vehículo."
            });
        }
    }
);

// PATCH /api/inventario/:id/activo
router.patch(
    "/api/inventario/:id/activo",
    requiereSesion,
    requiereAdministrador,
    async (req, res) => {
        try {
            const vehiculoId = validarId(req.params.id);
            const activo = req.body?.activo;

            if (!vehiculoId) {
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

            const pool = await obtenerConexion();

            const resultado = await pool.request()
                .input("id", sql.Int, vehiculoId)
                .input("activo", sql.Bit, activo)
                .query(`
                    UPDATE dbo.Vehiculos
                    SET
                        Activo = @activo,
                        FechaActualizacion = SYSDATETIME()
                    WHERE VehiculoId = @id;

                    SELECT @@ROWCOUNT AS FilasAfectadas;
                `);

            if (!resultado.recordset[0].FilasAfectadas) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "El vehículo no existe."
                });
            }

            await registrarAuditoria(pool, {
                usuarioId: obtenerUsuarioId(req),
                accion: activo ? "ACTIVAR_VEHICULO" : "DESACTIVAR_VEHICULO",
                tablaAfectada: "Vehiculos",
                registroId: vehiculoId,
                detalle: activo
                    ? "Se activó el vehículo."
                    : "Se desactivó el vehículo.",
                ip: req.ip
            });

            return res.json({
                ok: true,
                mensaje: activo
                    ? "Vehículo activado correctamente."
                    : "Vehículo desactivado correctamente."
            });
        } catch (error) {
            console.error("Error cambiando estado:", error.message);

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible cambiar el estado del vehículo."
            });
        }
    }
);

module.exports = router;
