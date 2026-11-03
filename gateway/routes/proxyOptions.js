// gateway/routes/proxyOptions.js
const config = require('../config/env');
const logger = require('../utils/logger');

// options communes des relais : chemin conservé, délai maximal, erreur en json au lieu d'une page html
module.exports = (name) => ({
  proxyReqPathResolver: (req) => req.originalUrl,
  timeout: config.proxyTimeoutMs,
  proxyErrorHandler: (err, res) => {
    logger.error('proxy.error', { service: name, reason: err.code || err.message });
    if (!res.headersSent) res.status(502).json({ message: `Service ${name} injoignable` });
  },
});
