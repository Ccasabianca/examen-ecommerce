// microservices/stock-management/app.js
const express = require('express');
const config = require('./config/env');
const logger = require('./utils/logger');
const requestLogger = require('./middlewares/requestLogger');
const internalKey = require('./middlewares/internalKey');
const pkg = require('./package.json');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'stock-management',
    version: pkg.version,
    commit: process.env.APP_COMMIT || 'dev',
    uptime: Math.round(process.uptime()),
  });
});

// fix : seul le gateway (clé interne) peut modifier le stock
app.use(internalKey);
app.use(express.json({ limit: '20kb' }));

app.post('/update-stock', (req, res) => {
  const { productId, quantity } = req.body;
  logger.info('stock.update_requested', { productId, quantity });
  res.send(`Stock mis à jour pour le produit de ID : ${productId}`);
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} introuvable` });
});

module.exports = app;
