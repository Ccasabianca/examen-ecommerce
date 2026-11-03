// gateway/server.js
let config;
try {
  config = require('./config/env');
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
}

const logger = require('./utils/logger');
const app = require('./app');

// Lancer le Gateway
// fix : port lu dans PORT (render) puis GATEWAY_PORT, logs winston
const server = app.listen(config.port, () => {
  logger.info(`Gateway opérationnel sur le port ${config.port}`, {
    notification: config.notifyUrl,
    stock: config.stockUrl,
  });
});

const shutdown = (signal) => {
  logger.info(`Signal ${signal} reçu, arrêt en cours`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
