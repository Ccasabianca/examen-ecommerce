// backend/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // fix : prix et stock négatifs refusés
  price: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  stock: { type: Number, required: true, min: 0 },
}, {
  timestamps: true, // Ajoute createdAt et updatedAt
});

module.exports = mongoose.model('Product', productSchema);
