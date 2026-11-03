// gateway/routes/stock.js
const express = require('express');
const proxy = require('express-http-proxy');
const config = require('../config/env');
const proxyOptions = require('./proxyOptions');

const router = express.Router();

// fix : url lue dans la config validée, délai et erreur 502 en json si le microservice ne répond pas
router.use('/', proxy(config.stockUrl, proxyOptions('stock')));

module.exports = router;
