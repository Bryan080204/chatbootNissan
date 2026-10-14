
const bcrypt = require("bcrypt");
const { obtenerConexion, sql } = require("../config/database");

const autenticarUsuario = async (correo, password) => {
    if (
        typeof correo !== "string" ||
        typeof password !== "string" ||
        !correo.trim() ||
        !password
    ) {
        throw new Error("CREDENCIALES_OBLIGATORIAS");
    }

    const pool = await obtenerConexion();

    const resultado = await pool
        .request()
        .input("correo", sql.NVarChar, correo.trim())
        .query(`
            SELECT
                u.UsuarioId,
                u.Nombre,
                u.Correo,
                u.PasswordHash,
                u.DebeCambiarPassword,
                r.Nombre AS Rol
            FROM dbo.Usuarios AS u
            INNER JOIN dbo.Roles AS r
                ON r.RolId = u.RolId
            WHERE u.Correo = @correo
              AND u.Activo = 1
              AND r.Activo = 1;
        `);

    const usuario = resultado.recordset[0];

    if (!usuario) {
        return null;
    }

    const passwordValida = await bcrypt.compare(
        password,
        usuario.PasswordHash
    );

    if (!passwordValida) {
        return null;
    }

    await pool
        .request()
        .input("usuarioId", sql.BigInt, usuario.UsuarioId)
        .query(`
            UPDATE dbo.Usuarios
            SET UltimoAcceso = SYSDATETIME()
            WHERE UsuarioId = @usuarioId;
        `);

    return {
        usuarioId: usuario.UsuarioId,
        nombre: usuario.Nombre,
        correo: usuario.Correo,
        rol: usuario.Rol,
        debeCambiarPassword: usuario.DebeCambiarPassword
    };
};

module.exports = {
    autenticarUsuario
};
