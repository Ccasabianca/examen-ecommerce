/** journal des requêtes http @module middlewares/requestLogger */
const logger = require('../utils/logger');

/** journalise chaque requête terminée : méthode, url, statut, durée, ip, utilisateur (piste d'audit) */
function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    let level = 'info';
    if (res.statusCode >= 500) level = 'error';
    else if (res.statusCode >= 400) level = 'warn';
    // les sondes de santé restent au niveau http pour ne pas remplir les logs
    else if (req.path.endsWith('/health') || req.path.includes('/health/')) level = 'http';

    logger.log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      ip: req.ip,
      forwardedFor: req.get('x-forwarded-for'),
      userId: req.user ? req.user.userId : undefined,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}

module.exports = requestLogger;
