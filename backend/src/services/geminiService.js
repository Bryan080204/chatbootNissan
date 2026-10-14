
const { GoogleGenAI } = require("@google/genai");

const MODELOS = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite"
];

const TIEMPO_MAXIMO = 50000;
const MAX_TOKENS_SALIDA = 512;

const obtenerClienteGemini = () => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
        throw new Error("Falta GEMINI_API_KEY en el archivo .env");
    }

    return new GoogleGenAI({ apiKey });
};

const obtenerMensajeError = (error) => {
    return String(error?.message || error || "");
};

const esCuotaAgotada = (error) => {
    const mensaje = obtenerMensajeError(error);

    return (
        /\b429\b/.test(mensaje) ||
        /RESOURCE_EXHAUSTED/i.test(mensaje) ||
        /quota exceeded/i.test(mensaje) ||
        /rate limit/i.test(mensaje)
    );
};

const esFalloTemporal = (error) => {
    const mensaje = obtenerMensajeError(error);

    return (
        mensaje === "GEMINI_TIMEOUT" ||
        /\b500\b/.test(mensaje) ||
        /\b502\b/.test(mensaje) ||
        /\b503\b/.test(mensaje) ||
        /\b504\b/.test(mensaje) ||
        /\bUNAVAILABLE\b/i.test(mensaje) ||
        /high demand/i.test(mensaje) ||
        /temporarily unavailable/i.test(mensaje) ||
        /timeout/i.test(mensaje) ||
        /ECONNRESET/i.test(mensaje) ||
        /ECONNREFUSED/i.test(mensaje) ||
        /ETIMEDOUT/i.test(mensaje)
    );
};

const generarConTiempoLimite = async (
    ai,
    modelo,
    mensaje
) => {
    let temporizador;

    try {
        const solicitud = ai.models.generateContent({
            model: modelo,
            contents: mensaje,
            config: {
                maxOutputTokens: MAX_TOKENS_SALIDA
            }
        });

        const limite = new Promise((_, reject) => {
            temporizador = setTimeout(() => {
                reject(new Error("GEMINI_TIMEOUT"));
            }, TIEMPO_MAXIMO);
        });

        const respuesta = await Promise.race([
            solicitud,
            limite
        ]);

        const texto = respuesta?.text?.trim();

        if (!texto) {
            throw new Error("GEMINI_EMPTY_RESPONSE");
        }

        return texto;
    }catch (error) {         
        console.log("Error en generateContent: ", error)
    }
    finally {
        clearTimeout(temporizador);
    }
};

const consultarGemini = async (mensaje) => {
    if (typeof mensaje !== "string" || !mensaje.trim()) {
        throw new Error(
            "El mensaje para Gemini es obligatorio"
        );
    }

    const ai = obtenerClienteGemini();
    let ultimoError;

    for (let i = 0; i < MODELOS.length; i++) {
        const modelo = MODELOS[i];

        console.log(`Consultando Gemini: ${modelo}`);

        try {
            const respuesta = await generarConTiempoLimite(
                ai,
                modelo,
                mensaje
            );

            console.log(
                `Gemini respondió usando: ${modelo}`
            );

            return respuesta;
        } catch (error) {
            ultimoError = error;

            console.error(
                `Error con ${modelo}:`,
                obtenerMensajeError(error)
            );

            // No seguir intentando modelos si se agotó
            // la cuota de la API.
            if (esCuotaAgotada(error)) {
                throw new Error("GEMINI_QUOTA_EXCEEDED");
            }

            const hayRespaldo = i < MODELOS.length - 1;

            // Solo cambiar de modelo ante fallos temporales.
            if (!hayRespaldo || !esFalloTemporal(error)) {
                break;
            }

            console.log(
                "Fallo temporal. Probando el siguiente modelo..."
            );
        }
    }

    if (ultimoError?.message === "GEMINI_TIMEOUT") {
        throw new Error("GEMINI_TIMEOUT");
    }

    if (ultimoError?.message === "GEMINI_EMPTY_RESPONSE") {
        throw new Error("GEMINI_EMPTY_RESPONSE");
    }

    throw new Error("GEMINI_UNAVAILABLE");
};

module.exports = {
    consultarGemini
};