/** configuration validée au démarrage, le serveur refuse de démarrer si elle est incomplète @module config/env */
// fix : chaque service lit son propre .env, même lancé depuis la racine (npm run start:all)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const Joi = require('joi');

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(5000),
  MONGO_URI: Joi.string()
    .pattern(/^mongodb(\+srv)?:\/\//)
    .required()
    .messages({ 'string.pattern.base': 'MONGO_URI doit commencer par mongodb:// ou mongodb+srv://' }),
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET doit contenir au moins 32 caractères',
  }),
  // liste d'origines séparées par des virgules ; create react app tourne sur 3000 en dev
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  // nombre de proxys de confiance devant l'api (0 en local, 1 derrière nginx ou render)
  TRUST_PROXY: Joi.number().integer().min(0).max(5).default(0),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
  GATEWAY_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:8000'),
  // même valeur dans le backend, le gateway et les microservices d'un environnement
  INTERNAL_API_KEY: Joi.string().min(32).required().messages({
    'string.min': 'INTERNAL_API_KEY doit contenir au moins 32 caractères',
  }),
  // un service gratuit render met environ une minute à se réveiller
  GATEWAY_TIMEOUT_MS: Joi.number().integer().min(1000).default(90000),
  ADMIN_NOTIFY_EMAIL: Joi.string().email().allow('').default(''),
}).unknown(true);

const { value: env, error } = schema.validate(process.env, { abortEarly: false, convert: true });

if (error) {
  throw new Error(`Configuration invalide : ${error.details.map((d) => d.message).join(' ; ')}`);
}

module.exports = Object.freeze({
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  mongoUri: env.MONGO_URI,
  jwtSecret: env.JWT_SECRET,
  corsOrigins: env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  trustProxy: env.TRUST_PROXY,
  logLevel: env.LOG_LEVEL,
  gatewayUrl: env.GATEWAY_URL.replace(/\/+$/, ''),
  internalApiKey: env.INTERNAL_API_KEY,
  gatewayTimeoutMs: env.GATEWAY_TIMEOUT_MS,
  adminNotifyEmail: env.ADMIN_NOTIFY_EMAIL,
});
