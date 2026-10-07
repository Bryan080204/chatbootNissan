const {
    procesarMensajeWhatsApp
} = require("../services/whatsappService");

const verificarWebhook = (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        console.log("Webhook verificado correctamente");

        res.status(200).send(challenge);
    } else {
        console.log("Error en la verificación del webhook");

        res.sendStatus(403);
    }
};

const recibirMensaje = (req, res) => {
    console.log("Webhook recibido");

    const mensaje = procesarMensajeWhatsApp(req.body);

    if (mensaje) {
        console.log("Número:", mensaje.numero);
        console.log("Tipo:", mensaje.tipo);
        console.log("Mensaje:", mensaje.texto);
        console.log("Intención:", mensaje.intencion);
    } else {
        console.log("Evento ignorado");
    }

    res.status(200).send("EVENT_RECEIVED");
};

module.exports = {
    verificarWebhook,
    recibirMensaje
};