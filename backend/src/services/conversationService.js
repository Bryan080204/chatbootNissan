const conversaciones = new Map();

const MAX_MENSAJES = 12;
const TIEMPO_EXPIRACION = 30 * 60 * 1000;

const obtenerConversacion = (numero) => {
    if (!numero) {
        return null;
    }

    let conversacion =
        conversaciones.get(numero);

    if (!conversacion) {
        conversacion = {
            mensajes: [],
            ultimaActividad: Date.now()
        };

        conversaciones.set(
            numero,
            conversacion
        );

        return conversacion;
    }

    const tiempoInactivo =
        Date.now() -
        conversacion.ultimaActividad;

    if (
        tiempoInactivo >
        TIEMPO_EXPIRACION
    ) {
        conversaciones.delete(numero);

        conversacion = {
            mensajes: [],
            ultimaActividad: Date.now()
        };

        conversaciones.set(
            numero,
            conversacion
        );
    }

    conversacion.ultimaActividad =
        Date.now();

    return conversacion;
};

const agregarMensaje = (
    numero,
    rol,
    contenido
) => {
    if (
        !numero ||
        !contenido ||
        !rol
    ) {
        return;
    }

    const conversacion =
        obtenerConversacion(numero);

    conversacion.mensajes.push({
        rol,
        contenido,
        fecha: Date.now()
    });

    if (
        conversacion.mensajes.length >
        MAX_MENSAJES
    ) {
        conversacion.mensajes =
            conversacion.mensajes.slice(
                -MAX_MENSAJES
            );
    }

    conversacion.ultimaActividad =
        Date.now();
};

const obtenerHistorial = (numero) => {
    const conversacion =
        obtenerConversacion(numero);

    if (!conversacion) {
        return [];
    }

    conversacion.ultimaActividad =
        Date.now();

    return [
        ...conversacion.mensajes
    ];
};

const limpiarConversacion = (
    numero
) => {
    if (!numero) {
        return;
    }

    conversaciones.delete(numero);
};

const limpiarConversacionesExpiradas = () => {
    const ahora = Date.now();

    for (
        const [
            numero,
            conversacion
        ] of conversaciones
    ) {
        const tiempoInactivo =
            ahora -
            conversacion.ultimaActividad;

        if (
            tiempoInactivo >
            TIEMPO_EXPIRACION
        ) {
            conversaciones.delete(
                numero
            );
        }
    }
};

setInterval(
    limpiarConversacionesExpiradas,
    5 * 60 * 1000
);

module.exports = {
    obtenerConversacion,
    agregarMensaje,
    obtenerHistorial,
    limpiarConversacion
};