/** configuration du microservice stock, validée au démarrage @module config/env */
// fix : chaque service lit son propre .env, même lancé depuis la racine (npm run start:all)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const Joi = require('joi');

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  // render impose PORT ; 4003 reste le port local d'origine
  PORT: Joi.number().port().default(4003),
  // fix : le stock est lu et modifié en base (avant, le service répondait sans rien faire)
  MONGO_URI: Joi.string()
    .pattern(/^mongodb(\+srv)?:\/\//)
    .required()
    .messages({ 'string.pattern.base': 'MONGO_URI doit commencer par mongodb:// ou mongodb+srv://' }),
  INTERNAL_API_KEY: Joi.string().min(32).required().messages({
    'string.min': 'INTERNAL_API_KEY doit contenir au moins 32 caractères',
  }),
  TRUST_PROXY: Joi.number().integer().min(0).max(5).default(0),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
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
  internalApiKey: env.INTERNAL_API_KEY,
  trustProxy: env.TRUST_PROXY,
  logLevel: env.LOG_LEVEL,
});
