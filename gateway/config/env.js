/** configuration du gateway, validée au démarrage @module config/env */
// fix : chaque service lit son propre .env, même lancé depuis la racine (npm run start:all)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const Joi = require('joi');

const url = Joi.string().uri({ scheme: ['http', 'https'] });

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  // render impose PORT ; GATEWAY_PORT reste lu pour le lancement local d'origine
  PORT: Joi.number().port(),
  GATEWAY_PORT: Joi.number().port().default(8000),
  NOTIFI_SERVICE_URL: url.required(),
  STOCK_SERVICE_URL: url.required(),
  INTERNAL_API_KEY: Joi.string().min(32).required().messages({
    'string.min': 'INTERNAL_API_KEY doit contenir au moins 32 caractères',
  }),
  // un microservice gratuit endormi met environ une minute à répondre
  PROXY_TIMEOUT_MS: Joi.number().integer().min(1000).default(90000),
  TRUST_PROXY: Joi.number().integer().min(0).max(5).default(0),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
}).unknown(true);

const { value: env, error } = schema.validate(process.env, { abortEarly: false, convert: true });

if (error) {
  throw new Error(`Configuration invalide : ${error.details.map((d) => d.message).join(' ; ')}`);
}

const trim = (u) => u.replace(/\/+$/, '');

module.exports = Object.freeze({
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT || env.GATEWAY_PORT,
  notifyUrl: trim(env.NOTIFI_SERVICE_URL),
  stockUrl: trim(env.STOCK_SERVICE_URL),
  internalApiKey: env.INTERNAL_API_KEY,
  proxyTimeoutMs: env.PROXY_TIMEOUT_MS,
  trustProxy: env.TRUST_PROXY,
  logLevel: env.LOG_LEVEL,
});
