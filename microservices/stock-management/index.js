let config;
try {
  config = require('./config/env');
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
}

const logger = require('./utils/logger');
const app = require('./app');

// fix : port lu dans PORT (render), avant 4003 en dur
const server = app.listen(config.port, () =>
  logger.info(`Service de gestion des stocks sur le port ${config.port}`)
);

const shutdown = (signal) => {
  logger.info(`Signal ${signal} reçu, arrêt en cours`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
