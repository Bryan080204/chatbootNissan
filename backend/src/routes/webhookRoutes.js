const express = require("express");

const {
    verificarWebhook,
    recibirMensaje
} = require("../controllers/webhookController");

const router = express.Router();

router.get("/webhook", verificarWebhook);

router.post("/webhook", recibirMensaje);

module.exports = router;