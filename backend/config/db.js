// config/db.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async (uri) => {
  mongoose.connection.on('error', (err) => logger.error(`Erreur MongoDB : ${err.message}`));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB déconnecté'));

  // fix : l'uri (avec identifiants) n'est plus écrite dans les logs, options obsolètes retirées
  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  logger.info('MongoDB connecté', { host: conn.connection.host, db: conn.connection.name });
};

module.exports = connectDB;
