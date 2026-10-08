const enrutarIntencion = (intencion) => {
    switch (intencion) {
        case "saludo":
            return "saludo";

        case "fecha":
            return "fecha";

        case "hora":
            return "hora";

        case "vehiculos":
            return "vehiculos";

        case "precios":
            return "precios";

        case "cotizacion":
            return "cotizacion";

        case "ubicacion":
            return "ubicacion";

        case "respuesta_ubicacion":
            return "respuesta_ubicacion";

        case "fuera_alcance":
            return "fuera_alcance";

        case "desconocido":
        default:
            return "desconocido";
    }
};

module.exports = {
    enrutarIntencion
};