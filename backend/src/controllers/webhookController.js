const webhook = (req, res) => {
    res.send("Webhook Nissan funcionando desde controller");
};

const verificarWebhook = (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("=== VERIFICACION WEBHOOK ===");
    console.log("mode:", mode);
    console.log("token recibido:", token);
    console.log("token esperado:", process.env.VERIFY_TOKEN);
    console.log("challenge:", challenge);

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        console.log("Webhook verificado correctamente");

        res.status(200).send(challenge);
    } else {
        console.log("Error en la verificacion del webhook");

        res.sendStatus(403);
    }
};

const recibirMensaje = (req, res) => {
    console.log("Datos recibidos:", req.body);

    res.status(200).send("EVENT_RECEIVED");
};

module.exports = {
    webhook,
    verificarWebhook,
    recibirMensaje
};