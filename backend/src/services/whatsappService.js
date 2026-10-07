const {
    detectarIntencion
} = require("./intentService");

const procesarMensajeWhatsApp = (body) => {
    if (
        !body ||
        body.object !== "whatsapp_business_account" ||
        !body.entry ||
        body.entry.length === 0
    ) {
        return null;
    }

    const changes = body.entry[0].changes;

    if (!changes || changes.length === 0) {
        return null;
    }

    const value = changes[0].value;

    if (!value.messages || value.messages.length === 0) {
        return null;
    }

    const mensaje = value.messages[0];

    const numero = mensaje.from;
    const tipo = mensaje.type;

    let texto = "";

    if (tipo === "text" && mensaje.text) {
        texto = mensaje.text.body;
    }

    const intencion = detectarIntencion(texto);

    return {
        numero,
        tipo,
        texto,
        intencion
    };
};

module.exports = {
    procesarMensajeWhatsApp
};