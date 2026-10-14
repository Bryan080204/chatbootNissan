
"use strict";

const app = require("./app");
const { obtenerConexion } = require("./config/database");

const PORT = Number(process.env.PORT || 3001);

async function iniciarServidor() {
    try {
        await obtenerConexion();
        console.log("Conexión a SQL Server establecida.");
    } catch (error) {
        const esProduccion = process.env.NODE_ENV === "production";

        console.warn(
            "No fue posible conectar con SQL Server:",
            error.message
        );

        if (esProduccion) {
            console.error(
                "El backend no puede iniciar en producción sin base de datos."
            );
            process.exit(1);
        }

        console.warn(
            "Continuando en modo desarrollo sin base de datos. " +
            "Las rutas /api que dependen de SQL no estarán disponibles."
        );
    }

    app.listen(PORT, () => {
        console.log(`Backend: http://localhost:${PORT}`);
        console.log(`Panel: http://localhost:3000/dashboard.html`);
    });
}

iniciarServidor();
