
"use strict";

const express = require("express");
const router = express.Router();

const { requiereSesion } = require("../middleware/auth");
const { obtenerDashboard } = require("../services/dashboardService");

// GET /api/dashboard
router.get(
    "/api/dashboard",
    requiereSesion,
    async (req, res) => {
        try {
            const datos = await obtenerDashboard();

            return res.json({
                ok: true,
                ...datos
            });
        } catch (error) {
            console.error(
                "Error consultando el dashboard:",
                error.message
            );

            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible consultar las estadísticas."
            });
        }
    }
);

module.exports = router;
