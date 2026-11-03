/** application express, séparée de server.js pour les tests @module app */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const config = require('./config/env');
const logger = require('./utils/logger');
const requestLogger = require('./middlewares/requestLogger');
const { notFound, errorHandler } = require('./middlewares/errors');
const gateway = require('./services/gatewayClient');
const { apiLimiter } = require('./middlewares/rateLimiters');
const pkg = require('./package.json');

// fix : un objet {"$ne": null} glissé dans un filtre de requête est neutralisé ($eq), en plus de la validation
mongoose.set('sanitizeFilter', true);

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
// fix : en-têtes de sécurité (helmet)
app.use(helmet());

// fix : cors limité aux origines de CORS_ORIGIN, avant cors() acceptait tout le monde
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      logger.warn('cors.blocked', { origin });
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
);

app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());
app.use(requestLogger);

/** sonde de santé, 503 si la base n'est pas joignable */
function health(_req, res) {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    service: 'backend',
    db: dbConnected ? 'connected' : 'disconnected',
    version: pkg.version,
    commit: process.env.APP_COMMIT || 'dev',
    uptime: Math.round(process.uptime()),
  });
}

app.get('/health', health);
app.get('/api/health', health);

/** sonde de toute la chaîne : base, gateway, notification, stock */
app.get('/api/health/deep', async (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  let chain;
  try {
    chain = await gateway.deepHealth();
  } catch (err) {
    chain = { status: 'down', error: err.message };
  }
  const ok = dbConnected && chain.status === 'ok';
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    backend: { db: dbConnected ? 'connected' : 'disconnected', version: pkg.version },
    gateway: chain,
  });
});

app.use('/api', apiLimiter);
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// fix : 404 en json et gestionnaire d'erreurs central (avant, page html d'express)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
