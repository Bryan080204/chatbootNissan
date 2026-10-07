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

    const body = req.body;

    if (
        body.object === "whatsapp_business_account" &&
        body.entry &&
        body.entry.length > 0
    ) {
        const changes = body.entry[0].changes;

        if (changes && changes.length > 0) {
            const value = changes[0].value;

            if (value.messages && value.messages.length > 0) {
                const mensaje = value.messages[0];

                const numero = mensaje.from;
                const tipo = mensaje.type;

                let texto = "";

                if (tipo === "text") {
                    texto = mensaje.text.body;
                }

                console.log("Número:", numero);
                console.log("Tipo:", tipo);
                console.log("Mensaje:", texto);
            }
        }
    }

    res.status(200).send("EVENT_RECEIVED");
};

module.exports = {
    verificarWebhook,
    recibirMensaje
};