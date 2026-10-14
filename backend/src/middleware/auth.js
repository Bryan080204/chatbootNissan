
"use strict";

// Middleware de autenticación y autorización reutilizable.
// Conserva el mismo comportamiento que ya usaba el inventario.

function obtenerUsuario(req) {
    return req.session?.usuario || null;
}

function obtenerUsuarioId(req) {
    const usuario = obtenerUsuario(req);

    const id =
        usuario?.usuarioId ??
        usuario?.UsuarioId ??
        usuario?.id ??
        null;

    if (id === null || !Number.isSafeInteger(Number(id))) {
        return null;
    }

    return Number(id);
}

function obtenerRol(req) {
    return String(obtenerUsuario(req)?.rol || "")
        .trim()
        .toLowerCase();
}

function esAdministrador(req) {
    return obtenerRol(req) === "administrador";
}

function requiereSesion(req, res, next) {
    if (!obtenerUsuario(req)) {
        return res.status(401).json({
            ok: false,
            mensaje: "Tu sesión expiró. Inicia sesión nuevamente."
        });
    }

    next();
}

function requiereAdministrador(req, res, next) {
    if (obtenerRol(req) !== "administrador") {
        return res.status(403).json({
            ok: false,
            mensaje: "No tienes permisos para realizar esta acción."
        });
    }

    next();
}

// Permite el acceso solo a los roles indicados (en minúsculas).
function requiereRoles(...rolesPermitidos) {
    const permitidos = rolesPermitidos.map((rol) =>
        String(rol).trim().toLowerCase()
    );

    return function (req, res, next) {
        if (!permitidos.includes(obtenerRol(req))) {
            return res.status(403).json({
                ok: false,
                mensaje: "No tienes permisos para realizar esta acción."
            });
        }

        next();
    };
}

module.exports = {
    obtenerUsuario,
    obtenerUsuarioId,
    obtenerRol,
    esAdministrador,
    requiereSesion,
    requiereAdministrador,
    requiereRoles
};
