// microservices/stock-management/app.js
const express = require('express');
const config = require('./config/env');
const db = require('./config/db');
const logger = require('./utils/logger');
const requestLogger = require('./middlewares/requestLogger');
const internalKey = require('./middlewares/internalKey');
const pkg = require('./package.json');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.use(requestLogger);

// fix : 503 si la base est injoignable, le gateway et la supervision voient la panne
app.get('/health', (_req, res) => {
  const dbConnected = db.isConnected();
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    service: 'stock-management',
    db: dbConnected ? 'connected' : 'disconnected',
    version: pkg.version,
    commit: process.env.APP_COMMIT || 'dev',
    uptime: Math.round(process.uptime()),
  });
});

// fix : seul le gateway (clé interne) peut modifier le stock
app.use(internalKey);
app.use(express.json({ limit: '20kb' }));

app.use(require('./routes/stock'));

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} introuvable` });
});

// express 5 transmet ici les promesses rejetées des routes async
app.use((err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Corps de requête JSON invalide' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Corps de requête trop volumineux' });
  }
  logger.error(err.stack || err.message, { method: req.method, path: req.originalUrl });
  return res.status(500).json({ message: 'Erreur interne du service de stock' });
});

module.exports = app;
