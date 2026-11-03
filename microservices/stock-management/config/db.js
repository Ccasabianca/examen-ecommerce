/** connexion mongodb, même base que le backend de l'environnement @module config/db */
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/** connexion à la base, l'uri (avec identifiants) n'est jamais écrite dans les logs */
async function connectDB(uri) {
  mongoose.connection.on('error', (err) => logger.error(`Erreur MongoDB : ${err.message}`));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB déconnecté'));

  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  logger.info('MongoDB connecté', { host: conn.connection.host, db: conn.connection.name });
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

function disconnectDB() {
  return mongoose.disconnect();
}

module.exports = { connectDB, isConnected, disconnectDB };
