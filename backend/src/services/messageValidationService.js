const validarMensaje = (texto) => {
    if (typeof texto !== "string") {
        return {
            valido: false,
            motivo: "El mensaje no es texto"
        };
    }

    const mensaje = texto.trim();

    if (mensaje.length === 0) {
        return {
            valido: false,
            motivo: "El mensaje está vacío"
        };
    }

    if (mensaje.length > 1000) {
        return {
            valido: false,
            motivo: "El mensaje excede el límite permitido"
        };
    }

    return {
        valido: true,
        texto: mensaje
    };
};

module.exports = {
    validarMensaje
};