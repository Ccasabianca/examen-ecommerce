/** validation des entrées avec joi @module middlewares/validate */
const logger = require('../utils/logger');

const MESSAGES_FR = {
  'any.required': '{{#label}} est obligatoire',
  'any.only': '{{#label}} a une valeur non autorisée',
  'string.base': '{{#label}} doit être une chaîne de caractères',
  'string.empty': '{{#label}} ne peut pas être vide',
  'string.min': '{{#label}} doit contenir au moins {{#limit}} caractères',
  'string.max': '{{#label}} ne peut pas dépasser {{#limit}} caractères',
  'string.email': '{{#label}} doit être une adresse email valide',
  'string.pattern.base': '{{#label}} a un format invalide',
  'number.base': '{{#label}} doit être un nombre',
  'number.integer': '{{#label}} doit être un nombre entier',
  'number.min': '{{#label}} doit être supérieur ou égal à {{#limit}}',
  'number.max': '{{#label}} doit être inférieur ou égal à {{#limit}}',
  'array.base': '{{#label}} doit être une liste',
  'array.min': '{{#label}} doit contenir au moins {{#limit}} élément',
  'array.max': '{{#label}} ne peut pas contenir plus de {{#limit}} éléments',
  'object.base': '{{#label}} doit être un objet',
};

/**
 * valide req[property] avec un schéma joi, 400 { message, errors } si invalide
 * @param {Object} schema schéma joi
 * @param {'body'|'params'} [property='body']
 * @returns {Function} middleware express
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    // fix : types stricts et champs inconnus retirés : un objet à la place d'une chaîne est refusé
    // ({"$ne": null}) et le prix envoyé par le client disparaît avant d'arriver au contrôleur
    const { value, error } = schema.validate(req[property] ?? {}, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
      messages: MESSAGES_FR,
      errors: { wrap: { label: false } },
    });

    if (error) {
      const errors = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
      logger.warn('validation.rejected', { path: req.originalUrl, fields: errors.map((e) => e.field) });
      return res.status(400).json({ message: errors.map((e) => e.message).join(' ; '), errors });
    }

    if (property === 'body') req.body = value;
    return next();
  };
}

module.exports = validate;
