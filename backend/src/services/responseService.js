const generarRespuesta = (ruta, texto) => {
    switch (ruta) {
        case "saludo":
            return "Hola 👋 Bienvenido a Nissan México. ¿En qué podemos ayudarte?";

        case "fecha": {
            const fecha = new Intl.DateTimeFormat(
                "es-MX",
                {
                    timeZone: "America/Mexico_City",
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            ).format(new Date());

            return `Hoy es ${fecha}.`;
        }

        case "hora": {
            const hora = new Intl.DateTimeFormat(
                "es-MX",
                {
                    timeZone: "America/Mexico_City",
                    hour: "numeric",
                    minute: "2-digit"
                }
            ).format(new Date());

            return `En este momento son las ${hora}.`;
        }

        case "vehiculos":
            return "Claro. Puedo ayudarte con información sobre los vehículos Nissan. ¿Qué tipo de vehículo estás buscando?";

        case "precios":
            return "Con gusto. ¿Qué modelo Nissan te interesa consultar?";

        case "cotizacion":
            return "Con gusto podemos ayudarte a iniciar una cotización. ¿Qué vehículo Nissan te interesa?";

        case "ubicacion":
            return "📍 Nuestra agencia Nissan se encuentra en Avenida Universidad 733, 68125 Oaxaca de Juárez, Oaxaca, México. Si buscas información de otra ciudad, dime cuál.";

        case "respuesta_ubicacion":
            return "📍 La información de ubicación que tengo disponible corresponde a nuestra agencia en Oaxaca de Juárez, Oaxaca.";

        case "fuera_alcance":
            return "Hola 👋 Soy el asistente virtual de Nissan México. Puedo ayudarte con información relacionada con Nissan, pero no cuento con información sobre ese tema.";

        case "desconocido":
        default:
            return "Hola 👋 Soy el asistente virtual de Nissan México.";
    }
};

module.exports = {
    generarRespuesta
};