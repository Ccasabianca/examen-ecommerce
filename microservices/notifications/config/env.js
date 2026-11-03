/** configuration du microservice de notification, validée au démarrage @module config/env */
// fix : chaque service lit son propre .env, même lancé depuis la racine (npm run start:all)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const Joi = require('joi');

// anciens noms du code d'origine acceptés en repli (EMAIL_USER, EMAIL_APPLICATION_PASSWORD, NOTIFI_PORT)
const source = {
  ...process.env,
  PORT: process.env.PORT || process.env.NOTIFI_PORT,
  SMTP_USER: process.env.SMTP_USER || process.env.EMAIL_USER,
  SMTP_PASS: process.env.SMTP_PASS || process.env.EMAIL_APPLICATION_PASSWORD,
};

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(4002),
  INTERNAL_API_KEY: Joi.string().min(32).required().messages({
    'string.min': 'INTERNAL_API_KEY doit contenir au moins 32 caractères',
  }),
  // smtp : envoi réel par nodemailer ; log : aucun envoi, le mail est seulement journalisé
  MAIL_TRANSPORT: Joi.string().valid('smtp', 'log').default('smtp'),
  SMTP_HOST: Joi.string().when('MAIL_TRANSPORT', { is: 'smtp', then: Joi.required() }),
  SMTP_PORT: Joi.number().port().default(465),
  // vide : déduit du port (465 = tls direct, les autres = starttls)
  SMTP_SECURE: Joi.boolean().empty(''),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  SMTP_TIMEOUT_MS: Joi.number().integer().min(1000).default(15000),
  MAIL_FROM: Joi.string().allow(''),
  TRUST_PROXY: Joi.number().integer().min(0).max(5).default(0),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
}).unknown(true);

const { value: env, error } = schema.validate(source, { abortEarly: false, convert: true });

if (error) {
  throw new Error(`Configuration invalide : ${error.details.map((d) => d.message).join(' ; ')}`);
}

module.exports = Object.freeze({
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  internalApiKey: env.INTERNAL_API_KEY,
  transport: env.MAIL_TRANSPORT,
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === undefined ? env.SMTP_PORT === 465 : env.SMTP_SECURE,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    timeoutMs: env.SMTP_TIMEOUT_MS,
  },
  mailFrom: env.MAIL_FROM || env.SMTP_USER,
  trustProxy: env.TRUST_PROXY,
  logLevel: env.LOG_LEVEL,
});
