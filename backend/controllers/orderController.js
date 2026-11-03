/** commandes : création, suivi et administration @module controllers/orderController */
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const config = require('../config/env');
const gateway = require('../services/gatewayClient');
const logger = require('../utils/logger');

const euros = (amount) => `${amount.toFixed(2)} €`;

/** lignes { productId, quantity } envoyées au microservice stock */
const stockLines = (items) => items.map((i) => ({ productId: String(i.productId), quantity: i.quantity }));

/** récapitulatif texte d'une commande pour les mails */
function summary(order) {
  const lines = order.items.map((i) => `${i.name} x ${i.quantity} : ${euros(i.price * i.quantity)}`);
  const a = order.shippingAddress;
  return [
    ...lines,
    `Total : ${euros(order.total)}`,
    '',
    `Livraison : ${order.shippingMethod}, ${a.street}, ${a.postalCode} ${a.city}, ${a.country}`,
    `Paiement : ${order.paymentMethod}`,
  ].join('\n');
}

/** mail au client de la commande, s'il existe encore */
async function notifyCustomer(order, subject, intro) {
  const user = await User.findById(order.userId);
  if (!user) return;
  gateway.notify({ to: user.email, subject, text: `Bonjour ${user.username},\n\n${intro}` });
}

/** POST /api/orders : prix lus en base, stock réservé par le microservice stock, mails client et admin */
exports.createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod, shippingMethod } = req.body;
  const { userId } = req.user;

  // deux lignes du même produit font une seule réservation
  const quantities = new Map();
  for (const { productId, quantity } of items) {
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  // fix : prix et total recalculés depuis la base, ceux envoyés par le client sont ignorés
  const products = await Product.find({ _id: mongoose.trusted({ $in: [...quantities.keys()] }) });
  if (products.length !== quantities.size) {
    return res.status(400).json({ message: 'Un produit du panier est introuvable, rechargez la page' });
  }
  const lacking = products.find((p) => p.stock < quantities.get(String(p._id)));
  if (lacking) {
    return res.status(409).json({ message: `Stock insuffisant pour ${lacking.name} (reste ${lacking.stock})` });
  }

  const orderItems = products.map((p) => ({
    productId: p._id,
    name: p.name,
    price: p.price,
    quantity: quantities.get(String(p._id)),
  }));
  const total = Math.round(orderItems.reduce((acc, i) => acc + i.price * i.quantity, 0) * 100) / 100;

  // fix : le stock est réservé par le microservice stock (avant : appel commenté, stock jamais décrémenté)
  await gateway.reserveStock(stockLines(orderItems));

  let order;
  try {
    order = await Order.create({
      userId,
      items: orderItems,
      total,
      shippingAddress,
      paymentMethod,
      shippingMethod,
      stockReserved: true,
    });
  } catch (err) {
    // commande non enregistrée : le stock réservé est rendu
    gateway
      .restoreStock(stockLines(orderItems))
      .catch((e) => logger.error('stock.restore_failed', { reason: e.message }));
    throw err;
  }

  logger.info('order.created', { orderId: String(order._id), userId, total });

  // fix : le client reçoit son récapitulatif (avant : une seule adresse en dur), l'admin garde sa copie
  await notifyCustomer(order, 'Confirmation de votre commande', `Votre commande ${order._id} est enregistrée.\n\n${summary(order)}`);
  gateway.notify({
    to: config.adminNotifyEmail,
    subject: 'Nouvelle Commande Créée',
    text: `Une commande a été créée avec succès pour les produits suivants :\n${summary(order)}`,
  });

  return res.status(201).json({ message: 'Commande créée avec succès', order });
};

/** GET /api/orders/mine : commandes du client connecté, les plus récentes d'abord */
exports.getMyOrders = async (req, res) => {
  // fix : suivi des commandes côté client, limité à ses propres commandes
  const orders = await Order.find({ userId: req.user.userId }).sort({ createdAt: -1 });
  res.json(orders);
};

/** GET /api/orders : toutes les commandes (admin) */
exports.getOrders = async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.status(200).json(orders);
};

/** change le statut, rend le stock à l'annulation et prévient le client */
async function changeStatus(req, res, status) {
  const order = await Order.findById(req.params.orderId);
  if (!order) return res.status(404).json({ message: 'Commande non trouvée.' });

  const previous = order.status;
  if (previous === 'Annulée' && status !== 'Annulée') {
    return res.status(409).json({ message: 'Une commande annulée ne change plus de statut.' });
  }

  // fix : une commande annulée rend son stock, une seule fois
  if (status === 'Annulée' && order.stockReserved) {
    await gateway.restoreStock(stockLines(order.items));
    order.stockReserved = false;
  }

  // fix : save() applique l'enum du schéma (avant, findByIdAndUpdate acceptait n'importe quel statut)
  order.status = status;
  order.updatedAt = new Date();
  await order.save();
  logger.info('order.status_changed', { orderId: String(order._id), from: previous, to: status, by: req.user.userId });

  if (previous !== status) {
    await notifyCustomer(order, 'Suivi de votre commande', `Votre commande ${order._id} est maintenant : ${status}.`);
  }
  return res.status(200).json({ message: 'Statut mis à jour avec succès', order });
}

/** PUT /api/orders/:orderId/status (admin) */
exports.updateOrderStatus = (req, res) => changeStatus(req, res, req.body.status);

/** PUT /api/orders/:orderId/validate (admin) : la commande passe en préparation */
// fix : la validation change vraiment le statut (avant, elle répondait sans rien faire)
exports.validateOrder = (req, res) => changeStatus(req, res, 'En cours de traitement');

/** DELETE /api/orders/:orderId (admin) */
exports.deleteOrder = async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) return res.status(404).json({ message: 'Commande non trouvée.' });

  // fix : la suppression répond (avant, requête pendante) et rend le stock encore réservé
  if (order.stockReserved && !['Expédiée', 'Délivrée'].includes(order.status)) {
    await gateway.restoreStock(stockLines(order.items));
  }
  await order.deleteOne();
  logger.info('order.deleted', { orderId: String(order._id), by: req.user.userId });
  return res.status(200).json({ message: 'Commande supprimée' });
};
