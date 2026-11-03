/** réservation et restauration du stock, appelées par le backend via le gateway @module routes/stock */
const express = require('express');
const Joi = require('joi');
const Product = require('../models/Product');
const logger = require('../utils/logger');

const router = express.Router();

const MAX_QUANTITY = 1000;

const itemsSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string()
          .pattern(/^[a-fA-F0-9]{24}$/)
          .required()
          .messages({
            'string.pattern.base': 'productId doit être un identifiant de 24 caractères hexadécimaux',
          }),
        quantity: Joi.number().integer().min(1).max(MAX_QUANTITY).required(),
      })
    )
    .min(1)
    .max(50)
    .required(),
});

/**
 * valide le corps et fusionne les lignes d'un même produit
 * @returns {Array<{productId: string, quantity: number}>|null} null si une réponse 400 est déjà partie
 */
function parseItems(req, res) {
  // express 5 : req.body reste undefined sans corps json
  const { value, error } = itemsSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
  if (error) {
    res.status(400).json({
      message: 'Données invalides',
      errors: error.details.map((d) => ({ field: d.path.join('.'), message: d.message })),
    });
    return null;
  }

  const merged = new Map();
  for (const { productId, quantity } of value.items) {
    const id = productId.toLowerCase();
    merged.set(id, (merged.get(id) || 0) + quantity);
  }
  const items = [...merged].map(([productId, quantity]) => ({ productId, quantity }));

  const tooMany = items.find((item) => item.quantity > MAX_QUANTITY);
  if (tooMany) {
    res.status(400).json({
      message: 'Données invalides',
      errors: [{ field: 'items', message: `quantité totale supérieure à ${MAX_QUANTITY} pour ${tooMany.productId}` }],
    });
    return null;
  }
  return items;
}

/** remet le stock des lignes déjà décrémentées (commande refusée en cours de route) */
async function compensate(reserved) {
  if (!reserved.length) return;
  const items = reserved.map(({ productId, quantity }) => ({ productId, quantity }));
  try {
    await Promise.all(
      items.map(({ productId, quantity }) =>
        Product.updateOne({ _id: productId }, { $inc: { stock: quantity } })
      )
    );
    logger.warn('stock.compensated', { items });
  } catch (err) {
    logger.error('stock.compensation_failed', { items, reason: err.message });
    throw err;
  }
}

/** décrément atomique ligne par ligne, arrêt à la première ligne impossible */
async function reserve(items) {
  const reserved = [];
  try {
    for (const { productId, quantity } of items) {
      // le filtre sur le stock rend le décrément atomique : jamais de stock négatif, même en concurrence
      const product = await Product.findOneAndUpdate(
        { _id: productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );
      if (!product) return { reserved, failed: { productId, quantity } };
      reserved.push({ productId, quantity, stock: product.stock });
    }
    return { reserved };
  } catch (err) {
    err.reserved = reserved;
    throw err;
  }
}

/**
 * POST /update-stock : réserve le stock d'une commande, tout ou rien
 * @name POST/update-stock
 * @function
 */
router.post('/update-stock', async (req, res) => {
  // fix : le stock est vraiment décrémenté (avant, réponse "Stock mis à jour" sans rien faire)
  const items = parseItems(req, res);
  if (!items) return undefined;

  let outcome;
  try {
    outcome = await reserve(items);
  } catch (err) {
    await compensate(err.reserved || []);
    throw err;
  }

  if (outcome.failed) {
    const { productId, quantity } = outcome.failed;
    const existing = await Product.findById(productId, 'name stock');
    await compensate(outcome.reserved);
    if (!existing) {
      logger.warn('stock.not_found', { productId });
      return res.status(404).json({ message: `Produit introuvable : ${productId}` });
    }
    logger.warn('stock.insufficient', { productId, requested: quantity, available: existing.stock });
    return res
      .status(409)
      .json({ message: `Stock insuffisant pour ${existing.name} (reste ${existing.stock})` });
  }

  logger.info('stock.decremented', { items: outcome.reserved });
  return res.json({
    message: 'Stock mis à jour',
    items: outcome.reserved.map(({ productId, stock }) => ({ productId, stock })),
  });
});

/**
 * POST /restore-stock : rend le stock d'une réservation annulée
 * @name POST/restore-stock
 * @function
 */
router.post('/restore-stock', async (req, res) => {
  const items = parseItems(req, res);
  if (!items) return undefined;

  // tous les produits doivent exister avant de toucher au stock
  const found = await Product.find({ _id: { $in: items.map((item) => item.productId) } }, '_id');
  const foundIds = new Set(found.map((product) => String(product._id)));
  const missing = items.find((item) => !foundIds.has(item.productId));
  if (missing) {
    logger.warn('stock.not_found', { productId: missing.productId });
    return res.status(404).json({ message: `Produit introuvable : ${missing.productId}` });
  }

  const restored = [];
  for (const { productId, quantity } of items) {
    const product = await Product.findByIdAndUpdate(
      productId,
      { $inc: { stock: quantity } },
      { new: true }
    );
    restored.push({ productId, stock: product ? product.stock : null });
  }

  logger.info('stock.restored', { items });
  return res.json({ message: 'Stock restauré', items: restored });
});

module.exports = router;
