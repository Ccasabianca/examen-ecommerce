const mongoose = require('mongoose');

const STATUSES = ['En attente', 'En cours de traitement', 'Expédiée', 'Délivrée', 'Annulée'];
const PAYMENT_METHODS = ['Carte bancaire', 'PayPal', 'Virement'];
const SHIPPING_METHODS = ['colissimo', 'chronopost'];

// Define the schema for individual order items
const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the product in your database
    ref: 'Product',
    required: true,
  },
  // nom au moment de la commande, pour l'historique du client et les mails
  name: { type: String },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Au moins 1 produit est requis'],
  },
  // fix : prix unitaire lu en base au moment de la commande, plus celui envoyé par le client
  price: {
    type: Number,
    required: true,
    min: 0,
  },
});

// Define the schema for the entire order
const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the user in your database
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema], // Array of order items
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'En attente',
    },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    shippingMethod: {
      type: String,
      enum: SHIPPING_METHODS,
      required: true,
    },
    // vrai tant que le stock réservé par le microservice stock n'a pas été rendu
    stockReserved: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Create the model
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
module.exports.STATUSES = STATUSES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.SHIPPING_METHODS = SHIPPING_METHODS;
