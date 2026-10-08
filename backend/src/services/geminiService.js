
const { GoogleGenAI } = require("@google/genai");

const MODELO = "gemini-3.8-flash";
const TIEMPO_MAXIMO = 12000;

const obtenerClienteGemini = () => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Falta GEMINI_API_KEY");
    }

    return new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });
};

const esCuotaAgotada = (error) => {
    const mensaje = String(error?.message || "");

    return (
        /\b429\b/.test(mensaje) ||
        mensaje.includes("RESOURCE_EXHAUSTED") ||
        /quota exceeded/i.test(mensaje) ||
        mensaje.includes("FreeTier")
    );
};

const consultarGemini = async (mensaje) => {
    if (typeof mensaje !== "string" || !mensaje.trim()) {
        throw new Error("El mensaje para Gemini es obligatorio");
    }

    const ai = obtenerClienteGemini();

    console.log(`Consultando Gemini: ${MODELO}`);

    let temporizador;

    try {
        const consulta = ai.models.generateContent({
            model: MODELO,
            contents: mensaje,
            config: {
                maxOutputTokens: 180,
                temperature: 0.4,
                thinkingConfig: {
                    thinkingLevel: "low"
                }
            }
        });

        const limite = new Promise((_, reject) => {
            temporizador = setTimeout(() => {
                reject(new Error("GEMINI_TIMEOUT"));
            }, TIEMPO_MAXIMO);
        });

        const respuesta = await Promise.race([
            consulta,
            limite
        ]);

        const texto = respuesta?.text?.trim();

        if (!texto) {
            throw new Error("GEMINI_EMPTY_RESPONSE");
        }

        return texto;
    } catch (error) {
        if (esCuotaAgotada(error)) {
            console.error("La cuota de Gemini está agotada.");
            throw new Error("GEMINI_QUOTA_EXCEEDED");
        }

        if (error?.message === "GEMINI_TIMEOUT") {
            console.error(
                `Gemini superó el límite de ${TIEMPO_MAXIMO} ms.`
            );
            throw error;
        }

        console.error("Error con Gemini:", error.message);
        throw new Error("GEMINI_UNAVAILABLE");
    } finally {
        clearTimeout(temporizador);
    }
};

module.exports = {
    consultarGemini
};