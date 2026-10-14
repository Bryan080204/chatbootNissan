
const bcrypt = require("bcrypt");
const {
    obtenerConexion,
    sql
} = require("../config/database");

const {
    autenticarUsuario
} = require("../services/authService");

const {
    registrarIntentoAcceso
} = require("../services/accessService");
 
// Crear la sesión del usuario.
function crearSesion(req, res, usuario, mensaje) {
    req.session.regenerate((error) => {
        if (error) {
            console.error("Error al crear sesión:", error.message);
            return res.status(500).json({
                error: "No fue posible crear la sesión."
            });
        }

        req.session.usuario = {
            usuarioId: String(usuario.usuarioId),
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.rol,
            debeCambiarPassword: Boolean(
                usuario.debeCambiarPassword
            )
        };

        req.session.save((error) => {
            if (error) {
                console.error("Error al guardar sesión:", error.message);
                return res.status(500).json({
                    error: "No fue posible guardar la sesión."
                });
            }

            return res.status(200).json({
                mensaje,
                usuario: req.session.usuario
            });
        });
    });
}

// Iniciar sesión.
async function iniciarSesion(req, res) {
    try {
        const { correo, password } = req.body || {};

        const usuario = await autenticarUsuario(correo, password);

        if (!usuario) {
            await registrarIntentoAcceso({
                correo,
                exitoso: false,
                motivo: "Credenciales incorrectas",
                ip: req.ip
            });

            return res.status(401).json({
                error: "Correo o contraseña incorrectos."
            });
        }

        await registrarIntentoAcceso({
            usuarioId: usuario.usuarioId,
            correo: usuario.correo,
            exitoso: true,
            motivo: "Inicio de sesión correcto",
            ip: req.ip
        });

        return crearSesion(
            req,
            res,
            usuario,
            "Inicio de sesión correcto."
        );
    } catch (error) {
        if (error.message === "CREDENCIALES_OBLIGATORIAS") {
            return res.status(400).json({
                error: "El correo y la contraseña son obligatorios."
            });
        }

        console.error("Error al iniciar sesión:", error.message);

        return res.status(500).json({
            error: "No fue posible iniciar sesión."
        });
    }
}

// Comprobar si todavía no existe ningún usuario.
async function consultarEstadoInicial(req, res) {
    try {
        const pool = await obtenerConexion();

        const resultado = await pool.request().query(`
            SELECT COUNT_BIG(*) AS Total
            FROM dbo.Usuarios;
        `);

        return res.status(200).json({
            necesitaConfiguracion:
                Number(resultado.recordset[0].Total) === 0
        });
    } catch (error) {
        console.error(
            "Error al consultar configuración:",
            error.message
        );

        return res.status(500).json({
            error: "No fue posible consultar la configuración inicial."
        });
    }
}

// Registrar el primer administrador.
async function configurarPrimerAdministrador(req, res) {
    const { nombre, correo, password } = req.body || {};

    if (
        typeof nombre !== "string" ||
        typeof correo !== "string" ||
        typeof password !== "string" ||
        !nombre.trim() ||
        !correo.trim() ||
        !password
    ) {
        return res.status(400).json({
            error: "Nombre, correo y contraseña son obligatorios."
        });
    }

    const nombreLimpio = nombre.trim();
    const correoLimpio = correo.trim();

    if (nombreLimpio.length > 150) {
        return res.status(400).json({
            error: "El nombre no puede superar 150 caracteres."
        });
    }

    if (
        correoLimpio.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)
    ) {
        return res.status(400).json({
            error: "Escribe un correo electrónico válido."
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            error: "La contraseña debe tener al menos 8 caracteres."
        });
    }

    let transaction;
    let transaccionActiva = false;

    try {
        const pool = await obtenerConexion();

        transaction = new sql.Transaction(pool);

        await transaction.begin(
            sql.ISOLATION_LEVEL.SERIALIZABLE
        );
        transaccionActiva = true;

        // Evitar que dos solicitudes creen el primer administrador.
        const comprobacion = await transaction.request().query(`
            SELECT COUNT_BIG(*) AS Total
            FROM dbo.Usuarios WITH (TABLOCKX, HOLDLOCK);
        `);

        if (Number(comprobacion.recordset[0].Total) > 0) {
            await transaction.rollback();
            transaccionActiva = false;

            return res.status(409).json({
                error: "La configuración inicial ya se realizó."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const resultado = await transaction.request()
            .input("nombre", sql.NVarChar(150), nombreLimpio)
            .input("correo", sql.NVarChar(254), correoLimpio)
            .input("passwordHash", sql.NVarChar(100), passwordHash)
            .query(`
                INSERT INTO dbo.Usuarios (
                    RolId,
                    Nombre,
                    Correo,
                    PasswordHash,
                    Activo,
                    DebeCambiarPassword,
                    FechaCreacion
                )
                OUTPUT
                    INSERTED.UsuarioId,
                    INSERTED.Nombre,
                    INSERTED.Correo,
                    INSERTED.DebeCambiarPassword
                VALUES (
                    1,
                    @nombre,
                    @correo,
                    @passwordHash,
                    1,
                    0,
                    SYSDATETIME()
                );
            `);

        const creado = resultado.recordset[0];

        await transaction.commit();
        transaccionActiva = false;

        return crearSesion(
            req,
            res,
            {
                usuarioId: creado.UsuarioId,
                nombre: creado.Nombre,
                correo: creado.Correo,
                rol: "administrador",
                debeCambiarPassword: creado.DebeCambiarPassword
            },
            "Administrador creado correctamente."
        );
    } catch (error) {
        if (transaccionActiva && transaction) {
            try {
                await transaction.rollback();
            } catch (errorRollback) {
                console.error(
                    "Error al revertir transacción:",
                    errorRollback.message
                );
            }
        }

        if (error.number === 2627 || error.number === 2601) {
            return res.status(409).json({
                error: "Ese correo ya está registrado."
            });
        }

        console.error(
            "Error al crear administrador:",
            error.message
        );

        return res.status(500).json({
            error: "No fue posible crear el administrador. Comprueba la conexión y el rol administrador."
        });
    }
}

module.exports = {
    iniciarSesion,
    consultarEstadoInicial,
    configurarPrimerAdministrador
};
