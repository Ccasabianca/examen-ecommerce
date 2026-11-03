/** accès réservé au backend : en-tête x-internal-key, /health reste public @module middlewares/internalKey */
const crypto = require('crypto');
const config = require('../config/env');
const logger = require('../utils/logger');

const expected = Buffer.from(config.internalApiKey);

/** comparaison en temps constant, une clé presque juste ne répond pas plus lentement */
function isValidKey(value) {
  const given = Buffer.from(String(value || ''));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function internalKey(req, res, next) {
  if (req.path === '/health') return next();
  if (isValidKey(req.get('x-internal-key'))) return next();
  logger.warn('internal_key.rejected', { method: req.method, path: req.originalUrl, ip: req.ip });
  return res.status(401).json({ message: 'Accès interne uniquement' });
}

module.exports = internalKey;
