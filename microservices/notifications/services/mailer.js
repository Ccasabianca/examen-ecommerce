/** envoi des mails par nodemailer (smtp) ou simple journal (log) @module services/mailer */
const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');

// en mode log, les derniers messages restent consultables (tests, préproduction sans smtp)
const outbox = [];
let smtpStatus = config.transport === 'smtp' ? 'non vérifié' : 'log';

// fix : serveur smtp paramétrable (avant service gmail en dur), délais pour ne pas bloquer une requête
const transporter =
  config.transport === 'smtp'
    ? nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
        connectionTimeout: config.smtp.timeoutMs,
        greetingTimeout: config.smtp.timeoutMs,
        socketTimeout: config.smtp.timeoutMs,
      })
    : null;

/** envoie un mail texte, renvoie son identifiant */
async function send({ to, subject, text }) {
  if (!transporter) {
    outbox.push({ to, subject, text });
    if (outbox.length > 50) outbox.shift();
    logger.info('mail.logged', { to, subject });
    return { messageId: `log-${Date.now()}` };
  }
  const info = await transporter.sendMail({ from: config.mailFrom, to, subject, text });
  return { messageId: info.messageId };
}

/** teste la connexion smtp au démarrage : un port bloqué ou un mot de passe refusé se voit dans les logs */
async function verify() {
  if (!transporter) return;
  try {
    await transporter.verify();
    smtpStatus = 'ok';
    logger.info('smtp.ready', { host: config.smtp.host, port: config.smtp.port });
  } catch (err) {
    smtpStatus = `erreur ${err.code || err.message}`;
    logger.error('smtp.verify_failed', {
      host: config.smtp.host,
      port: config.smtp.port,
      reason: err.code || err.message,
    });
  }
}

module.exports = { send, verify, outbox, status: () => smtpStatus };
