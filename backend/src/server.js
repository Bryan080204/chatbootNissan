
"use strict";

const app = require("./app");
const { obtenerConexion } = require("./config/database");

const PORT = Number(process.env.PORT || 3001);

async function iniciarServidor() {
    try {
        await obtenerConexion();

        console.log("Conexión a SQL Server establecida.");

        app.listen(PORT, () => {
            console.log(`Backend: http://localhost:${PORT}`);
            console.log(`Panel: http://localhost:3000/dashboard.html`);
        });
    } catch (error) {
        console.error(
            "Error al iniciar el backend:",
            error.message
        );

        process.exit(1);
    }
}

iniciarServidor();
