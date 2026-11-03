/** catalogue et stock @module controllers/productController */
const Product = require('../models/Product');
const logger = require('../utils/logger');

/** GET /api/products */
exports.getProducts = async (req, res) => {
  const products = await Product.find();
  res.json(products);
};

/** PUT /api/products/:productId/stock (admin) : inventaire saisi à la main */
exports.updateProductStock = async (req, res) => {
  const { stock } = req.body;
  const { productId } = req.params;

  const product = await Product.findByIdAndUpdate(productId, { stock }, { new: true, runValidators: true });
  if (!product) {
    return res.status(404).json({ message: 'Produit non trouvé.' });
  }

  logger.info('product.stock_set', { productId, stock, by: req.user.userId });
  res.json({ message: 'Stock mis à jour avec succès.', product });
};
