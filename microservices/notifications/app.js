// microservices/notifications/app.js
const express = require('express');
const Joi = require('joi');
const config = require('./config/env');
const logger = require('./utils/logger');
const requestLogger = require('./middlewares/requestLogger');
const internalKey = require('./middlewares/internalKey');
const mailer = require('./services/mailer');
const pkg = require('./package.json');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'notifications',
    version: pkg.version,
    commit: process.env.APP_COMMIT || 'dev',
    transport: config.transport,
    smtp: mailer.status(),
    uptime: Math.round(process.uptime()),
  });
});

// fix : seul le gateway (clé interne) peut demander un envoi, avant le service était un relais ouvert
app.use(internalKey);
app.use(express.json({ limit: '20kb' }));

// fix : une seule adresse valide, sujet sur une ligne : plus d'injection d'en-têtes (Bcc...) ni d'envoi massif
const notifySchema = Joi.object({
  to: Joi.string().trim().email().max(254).required(),
  subject: Joi.string()
    .trim()
    .max(150)
    .pattern(/^[^\r\n]*$/)
    .required(),
  text: Joi.string().max(10000).required(),
});

// Route pour envoyer un email
app.post('/notify', async (req, res) => {
  const { value, error } = notifySchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    logger.warn('notify.invalid', { reason: error.message });
    return res.status(400).json({ message: 'Notification invalide', details: error.message });
  }

  try {
    const { messageId } = await mailer.send(value);
    logger.info('notify.sent', { to: value.to, subject: value.subject, messageId });
    return res.status(200).json({ message: 'Email envoyé avec succès.' });
  } catch (err) {
    // fix : l'objet d'erreur complet n'est plus renvoyé au client (il exposait la config smtp)
    logger.error('notify.failed', { to: value.to, reason: err.code || err.message });
    return res.status(502).json({ message: "Erreur lors de l'envoi de l'email." });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} introuvable` });
});

module.exports = app;
