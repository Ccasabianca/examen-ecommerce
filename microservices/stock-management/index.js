let config;
try {
  config = require('./config/env');
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
}

const logger = require('./utils/logger');
const db = require('./config/db');
const app = require('./app');

async function start() {
  // fix : connexion à la base avant d'accepter des demandes de stock
  await db.connectDB(config.mongoUri);

  // fix : port lu dans PORT (render), avant 4003 en dur
  const server = app.listen(config.port, () =>
    logger.info(`Service de gestion des stocks sur le port ${config.port}`)
  );

  const shutdown = (signal) => {
    logger.info(`Signal ${signal} reçu, arrêt en cours`);
    server.close(async () => {
      await db.disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  logger.error(`Promesse rejetée non gérée : ${reason instanceof Error ? reason.stack : reason}`);
});

start().catch((err) => {
  logger.error(`Démarrage impossible : ${err.message}`);
  process.exit(1);
});
