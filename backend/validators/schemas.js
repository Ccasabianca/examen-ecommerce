/** schémas joi des entrées de l'api @module validators/schemas */
const Joi = require('joi');
const { STATUSES, PAYMENT_METHODS, SHIPPING_METHODS } = require('../models/Order');

const objectId = Joi.string()
  .pattern(/^[a-fA-F0-9]{24}$/)
  .messages({ 'string.pattern.base': '{{#label}} est invalide' });

const username = Joi.string()
  .trim()
  .min(3)
  .max(30)
  .pattern(/^[a-zA-Z0-9._-]+$/)
  .label("Le nom d'utilisateur")
  .messages({
    'string.pattern.base': '{{#label}} ne peut contenir que des lettres, des chiffres et les caractères . _ -',
  });

// 72 : longueur maximale prise en compte par bcrypt
const password = Joi.string().min(8).max(72).label('Le mot de passe');

// fix : pas de balise html dans l'adresse, affichée chez l'admin et reprise dans les mails
const addressField = (label, max) =>
  Joi.string()
    .trim()
    .min(1)
    .max(max)
    .pattern(/^[^<>]*$/)
    .label(label)
    .messages({ 'string.pattern.base': '{{#label}} ne doit pas contenir < ou >' });

module.exports = {
  register: Joi.object({
    username: username.required(),
    email: Joi.string().trim().lowercase().email().max(254).required().label("L'adresse email"),
    password: password.required(),
  }),

  // contrôle de type et de taille seulement : la politique de mot de passe n'est pas révélée au login
  login: Joi.object({
    username: Joi.string().trim().max(30).required().label("Le nom d'utilisateur"),
    password: Joi.string().max(72).required().label('Le mot de passe'),
  }),

  createOrder: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          productId: objectId.required().label('Le produit'),
          quantity: Joi.number().integer().min(1).max(100).required().label('La quantité'),
        })
      )
      .min(1)
      .max(50)
      .required()
      .label('Le panier'),
    shippingAddress: Joi.object({
      street: addressField('La rue', 200).required(),
      city: addressField('La ville', 100).required(),
      postalCode: Joi.string()
        .trim()
        .pattern(/^[A-Za-z0-9 -]{3,10}$/)
        .required()
        .label('Le code postal'),
      country: addressField('Le pays', 100).required(),
    })
      .required()
      .label("L'adresse de livraison"),
    paymentMethod: Joi.string().valid(...PAYMENT_METHODS).required().label('Le mode de paiement'),
    shippingMethod: Joi.string().valid(...SHIPPING_METHODS).required().label('La méthode de livraison'),
  }),

  orderStatus: Joi.object({ status: Joi.string().valid(...STATUSES).required().label('Le statut') }),
  productStock: Joi.object({
    stock: Joi.number().integer().min(0).max(100000).required().label('Le stock'),
  }),
  orderIdParams: Joi.object({ orderId: objectId.required().label("L'identifiant de commande") }),
  productIdParams: Joi.object({ productId: objectId.required().label("L'identifiant de produit") }),
};
