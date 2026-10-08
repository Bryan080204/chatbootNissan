const enviarMensajeWhatsApp = async (numero, texto) => {
    if (!numero || !texto) {
        throw new Error("Número y texto son obligatorios");
    }

    if (!process.env.WHATSAPP_ACCESS_TOKEN) {
        throw new Error("Falta WHATSAPP_ACCESS_TOKEN");
    }

    if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
        throw new Error("Falta WHATSAPP_PHONE_NUMBER_ID");
    }

    if (!process.env.WHATSAPP_API_VERSION) {
        throw new Error("Falta WHATSAPP_API_VERSION");
    }

    const url = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const respuesta = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to: numero,
            type: "text",
            text: {
                body: texto
            }
        })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(
            `Error de WhatsApp API: ${JSON.stringify(datos)}`
        );
    }

    return datos;
};

module.exports = {
    enviarMensajeWhatsApp
};