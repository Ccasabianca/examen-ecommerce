// gateway/routes/notif.js
const express = require('express');
const proxy = require('express-http-proxy');
const config = require('../config/env');
const proxyOptions = require('./proxyOptions');

const router = express.Router();

// fix : url lue dans la config validée, délai et erreur 502 en json si le microservice ne répond pas
// fix : un seul routeur de notification (notif.js était vide, notifi.js portait le code)
router.use('/', proxy(config.notifyUrl, proxyOptions('notification')));

module.exports = router;
