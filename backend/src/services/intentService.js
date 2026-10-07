const normalizarTexto = (texto) => {
    if (!texto) {
        return "";
    }

    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
};

const detectarIntencion = (texto) => {
    const mensaje = normalizarTexto(texto);

    if (!mensaje) {
        return "desconocido";
    }

    if (
        mensaje.includes("hola") ||
        mensaje.includes("buenos dias") ||
        mensaje.includes("buenas tardes") ||
        mensaje.includes("buenas noches")
    ) {
        return "saludo";
    }

    if (
        mensaje.includes("auto") ||
        mensaje.includes("autos") ||
        mensaje.includes("vehiculo") ||
        mensaje.includes("vehiculos") ||
        mensaje.includes("modelo") ||
        mensaje.includes("modelos")
    ) {
        return "vehiculos";
    }

    if (
        mensaje.includes("cotizacion") ||
        mensaje.includes("cotizar") ||
        mensaje.includes("cotiza")
    ) {
        return "cotizacion";
    }

    if (
        mensaje.includes("precio") ||
        mensaje.includes("precios") ||
        mensaje.includes("cuanto cuesta") ||
        mensaje.includes("cuanto vale") ||
        mensaje.includes("cuesta") ||
        mensaje.includes("vale")
    ) {
        return "precios";
    }

    if (
        mensaje.includes("ubicacion") ||
        mensaje.includes("ubicaciones") ||
        mensaje.includes("direccion") ||
        mensaje.includes("donde estan") ||
        mensaje.includes("donde se encuentran")
    ) {
        return "ubicacion";
    }

    return "desconocido";
};

module.exports = {
    detectarIntencion
};