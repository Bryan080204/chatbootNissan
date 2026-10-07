const express = require("express");

const {
    webhook,
    verificarWebhook,
    recibirMensaje
} = require("../controllers/webhookController");

const router = express.Router();

router.get("/webhook", webhook);

router.get("/webhook/verify", verificarWebhook);

router.post("/webhook", recibirMensaje);

module.exports = router;