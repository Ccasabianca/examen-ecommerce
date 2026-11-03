// notifi/server.js
let config;
try {
  config = require('./config/env');
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
}

const logger = require('./utils/logger');
const mailer = require('./services/mailer');
const app = require('./app');

// Lancer le service Notification
// fix : plus d'identifiants smtp dans les logs, port lu dans PORT (render) puis NOTIFI_PORT
const server = app.listen(config.port, () => {
  logger.info(`Service de notification en écoute sur le port ${config.port}`, {
    transport: config.transport,
    smtpHost: config.smtp.host,
    smtpPort: config.smtp.port,
  });
  mailer.verify();
});

const shutdown = (signal) => {
  logger.info(`Signal ${signal} reçu, arrêt en cours`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
