/** routes inconnues et erreurs, réponses en json avec un champ message (lu par le front) @module middlewares/errors */
const config = require('../config/env');
const logger = require('../utils/logger');

/** 404 en json pour toute route inconnue */
function notFound(req, res) {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} introuvable` });
}

/** gestionnaire d'erreurs final : validation et id invalides en 400, doublon en 409, pas de détail en prod */
function errorHandler(err, req, res, _next) {
  let status = err.status || err.statusCode || 500;
  let message = 'Erreur interne du serveur';

  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(' ; ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Identifiant invalide';
  } else if (err.code === 11000) {
    status = 409;
    message = 'Cette valeur existe déjà';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Corps de requête JSON invalide';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Corps de requête trop volumineux';
  } else if (status < 500 || err.expose) {
    message = err.message || message;
  }

  if (status >= 500) {
    logger.error(err.stack || err.message, { method: req.method, path: req.originalUrl });
  } else {
    logger.warn(`Erreur ${status} : ${message}`, { method: req.method, path: req.originalUrl });
  }

  const body = { message };
  if (!config.isProd && status >= 500 && !err.expose) body.detail = err.message;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
