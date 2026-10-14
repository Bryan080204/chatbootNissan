
const express = require("express");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");

const FRONTEND_PORT = 3000;
const BACKEND_PORT = 3001;

const publicPath = path.join(__dirname, "backend", "public");
const loginPath = path.join(publicPath, "login.html");

if (!fs.existsSync(loginPath)) {
    console.error("No se encontró:", loginPath);
    process.exit(1);
}

const frontend = express();

// Página inicial.
frontend.get("/", (req, res) => {
    res.redirect("/login.html");
});

// Login: archivo estático.
frontend.get("/login.html", (req, res) => {
    res.sendFile(loginPath);
});

// Dashboard: validar sesión en el backend.
frontend.get("/dashboard.html", (req, res) => {
    enviarAlBackend(req, res);
});

// API de autenticación y demás rutas /api.
frontend.use("/api", (req, res) => {
    enviarAlBackend(req, res);
});

// Archivos estáticos: CSS, JavaScript, imágenes, etc.
frontend.use(express.static(publicPath));

// Error 404.
frontend.use((req, res) => {
    res.status(404).send("No se encontró la página solicitada.");
});

// Proxy hacia el backend.
function enviarAlBackend(req, res) {
    const proxy = http.request(
        {
            hostname: "127.0.0.1",
            port: BACKEND_PORT,
            path: req.originalUrl,
            method: req.method,
            headers: {
                ...req.headers,
                host: `127.0.0.1:${BACKEND_PORT}`
            }
        },
        (respuesta) => {
            res.writeHead(
                respuesta.statusCode || 502,
                respuesta.headers
            );

            respuesta.pipe(res);
        }
    );

    proxy.on("error", (error) => {
        console.error("Error del backend:", error.message);

        if (!res.headersSent) {
            res.status(502).send(
                "El backend no está disponible en el puerto 3001."
            );
        } else {
            res.destroy();
        }
    });

    req.pipe(proxy);
}

// Iniciar frontend.
const servidorFrontend = frontend.listen(
    FRONTEND_PORT,
    () => {
        console.log(
            `Frontend: http://localhost:${FRONTEND_PORT}/login.html`
        );
    }
);

// Iniciar backend existente.
const backend = spawn(
    process.execPath,
    [path.join(__dirname, "backend", "src", "server.js")],
    {
        cwd: __dirname,
        env: {
            ...process.env,
            PORT: String(BACKEND_PORT)
        },
        stdio: "inherit"
    }
);

backend.on("error", (error) => {
    console.error("No se pudo iniciar el backend:", error.message);
});

backend.on("exit", (code) => {
    console.log(`Backend finalizado. Código: ${code}`);
    servidorFrontend.close();
});

function detenerServicios() {
    servidorFrontend.close();

    if (backend.exitCode === null && !backend.killed) {
        backend.kill();
    }
}

process.on("SIGINT", detenerServicios);
process.on("SIGTERM", detenerServicios);
