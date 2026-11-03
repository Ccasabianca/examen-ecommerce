/** journal des requêtes http @module middlewares/requestLogger */
const logger = require('../utils/logger');

/** journalise chaque requête terminée : méthode, url, statut, durée, ip */
function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    let level = 'info';
    if (res.statusCode >= 500) level = 'error';
    else if (res.statusCode >= 400) level = 'warn';
    else if (req.path.startsWith('/health')) level = 'http';

    logger.log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      ip: req.ip,
    });
  });

  next();
}

module.exports = requestLogger;
