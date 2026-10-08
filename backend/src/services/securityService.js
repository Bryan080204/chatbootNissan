const validarSeguridadMensaje = (texto) => {
    if (typeof texto !== "string") {
        return {
            seguro: false,
            motivo: "Entrada inválida"
        };
    }

    const mensaje = texto.trim();

    // Detectar caracteres repetidos demasiadas veces
    if (/(.)\1{20,}/.test(mensaje)) {
        return {
            seguro: false,
            motivo: "Mensaje excesivamente repetitivo"
        };
    }

    // Detectar exceso de caracteres extraños
    const caracteresEspeciales = mensaje.match(
        /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,!?¿¡$%()-]/g
    );

    if (caracteresEspeciales && caracteresEspeciales.length > 30) {
        return {
            seguro: false,
            motivo: "Exceso de caracteres especiales"
        };
    }

    return {
        seguro: true
    };
};

module.exports = {
    validarSeguridadMensaje
};