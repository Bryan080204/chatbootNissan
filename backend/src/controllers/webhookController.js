
const {
    procesarMensajeWhatsApp
} = require("../services/whatsappService");

const {
    enviarMensajeWhatsApp
} = require("../services/whatsappApiService");

const MENSAJES_PROCESADOS = new Map();
const RETENCION_ID = 24 * 60 * 60 * 1000;

const verificarWebhook = (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (
        mode === "subscribe" &&
        token &&
        token === process.env.VERIFY_TOKEN
    ) {
        return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
};

const obtenerIdMensaje = (body) => {
    return body?.entry?.[0]
        ?.changes?.[0]
        ?.value?.messages?.[0]?.id || null;
};

const procesarEnSegundoPlano = async (body) => {
    try {
        const mensaje = await procesarMensajeWhatsApp(body);

        if (!mensaje) {
            console.log("Evento ignorado");
            return;
        }

        console.log("Número:", mensaje.numero);
        console.log("Tipo:", mensaje.tipo);
        console.log("Mensaje:", mensaje.texto);

        if (!mensaje.valido) {
            console.log("Mensaje rechazado:", mensaje.motivo);
            return;
        }

        console.log("Intención:", mensaje.intencion);
        console.log("Ruta:", mensaje.ruta);

        await enviarMensajeWhatsApp(
            mensaje.numero,
            mensaje.respuesta
        );

        console.log("Respuesta enviada a WhatsApp");
    } catch (error) {
        console.error(
            "Error procesando mensaje en segundo plano:",
            error.message
        );
    }
};

const recibirMensaje = (req, res) => {
    const body = req.body;

    // Confirmar recepción antes de llamar a Gemini.
    res.status(200).send("EVENT_RECEIVED");

    const idMensaje = obtenerIdMensaje(body);

    if (idMensaje) {
        const ahora = Date.now();
        const registrado = MENSAJES_PROCESADOS.get(idMensaje);

        if (registrado && registrado > ahora) {
            console.log("Mensaje duplicado ignorado:", idMensaje);
            return;
        }

        MENSAJES_PROCESADOS.set(
            idMensaje,
            ahora + RETENCION_ID
        );
    }

    // La limpieza se realiza sin bloquear la respuesta HTTP.
    setImmediate(() => {
        const ahora = Date.now();

        for (const [id, vencimiento] of MENSAJES_PROCESADOS) {
            if (vencimiento <= ahora) {
                MENSAJES_PROCESADOS.delete(id);
            }
        }
    });

    setImmediate(() => {
        procesarEnSegundoPlano(body);
    });
};

module.exports = {
    verificarWebhook,
    recibirMensaje
};