const webhook = (req, res) => {
    res.send("Webhook Nissan funcionando desde controller");
};

const verificarWebhook = (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
};

const recibirMensaje = (req, res) => {
    console.log("Datos recibidos:", req.body);

    res.status(200).json({
        mensaje: "Mensaje recibido correctamente"
    });
};

module.exports = {
    webhook,
    verificarWebhook,
    recibirMensaje
};