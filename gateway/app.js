// gateway/app.js
const express = require('express');
const config = require('./config/env');
const requestLogger = require('./middlewares/requestLogger');
const internalKey = require('./middlewares/internalKey');
//const authProxy = require('./routes/auth');
const notifiProxy = require('./routes/notif');
const stockProxy = require('./routes/stock');
const pkg = require('./package.json');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'gateway',
    version: pkg.version,
    commit: process.env.APP_COMMIT || 'dev',
    uptime: Math.round(process.uptime()),
  });
});

// fix : le gateway n'accepte plus que le backend (clé interne), avant n'importe qui envoyait des mails
app.use(internalKey);

/** état des microservices : réveille aussi les services gratuits endormis */
app.get('/health/deep', async (_req, res) => {
  const check = async (name, base) => {
    const started = Date.now();
    try {
      const r = await fetch(`${base}/health`, { signal: AbortSignal.timeout(config.proxyTimeoutMs) });
      return { name, status: r.ok ? 'ok' : `http ${r.status}`, durationMs: Date.now() - started };
    } catch (err) {
      return { name, status: 'down', error: err.name, durationMs: Date.now() - started };
    }
  };
  const services = await Promise.all([
    check('notification', config.notifyUrl),
    check('stock', config.stockUrl),
  ]);
  const ok = services.every((s) => s.status === 'ok');
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', services });
});

// Middleware pour analyser les requêtes JSON
app.use(express.json({ limit: '20kb' }));

// Routes principales pour chaque microservice
//app.use('/auth', authProxy);
app.use('/notify', notifiProxy);
app.use('/update-stock', stockProxy);
// fix : le backend rend le stock d'une commande annulée, supprimée ou non enregistrée
app.use('/restore-stock', stockProxy);

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} introuvable` });
});

module.exports = app;
