/** limitation de débit @module middlewares/rateLimiters */
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const config = require('../config/env');
const logger = require('../utils/logger');

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const common = {
  windowMs: FIFTEEN_MINUTES,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: (req, res, _next, options) => {
    logger.warn('rate_limit.exceeded', { ip: req.ip, path: req.originalUrl });
    res.status(options.statusCode).json(options.message);
  },
};

/** limite large pour toute l'api, par adresse ip */
const apiLimiter = rateLimit({
  ...common,
  limit: 600,
  message: { message: 'Trop de requêtes, réessayez dans quelques minutes' },
});

// fix : anti force brute sur la connexion, par compte visé et par adresse ip, seuls les échecs comptent
const loginLimiter = rateLimit({
  ...common,
  limit: config.rateLimitAuthMax,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    return `${ipKeyGenerator(req.ip)}|${username}`;
  },
  message: { message: 'Trop de tentatives, réessayez dans 15 minutes' },
});

/** inscriptions par adresse ip */
const registerLimiter = rateLimit({
  ...common,
  limit: 20,
  message: { message: "Trop d'inscriptions depuis cette adresse, réessayez plus tard" },
});

module.exports = { apiLimiter, loginLimiter, registerLimiter };
