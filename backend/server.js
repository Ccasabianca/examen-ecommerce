// server.js
let config;
try {
  config = require('./config/env');
} catch (err) {
  // le logger dépend de la config, on écrit directement sur stderr
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
}

const mongoose = require('mongoose');
const logger = require('./utils/logger');
const connectDB = require('./config/db');
const app = require('./app');

async function start() {
  await connectDB(config.mongoUri);

  const server = app.listen(config.port, () => {
    logger.info(`Serveur en écoute sur le port ${config.port}`, {
      env: config.env,
      gateway: config.gatewayUrl,
      corsOrigins: config.corsOrigins,
    });
  });

  // fix : arrêt propre (render envoie sigterm), les requêtes en cours finissent avant la fermeture de mongodb
  const shutdown = (signal) => {
    logger.info(`Signal ${signal} reçu, arrêt en cours`);
    server.close(async () => {
      await mongoose.disconnect();
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
