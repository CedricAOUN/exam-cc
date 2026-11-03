/**
 * Mongoose model for catalogue products.
 * @typedef {Object} ProductDocument
 * @property {string} name
 * @property {number} price Unit price (>= 0).
 * @property {string} description
 * @property {number} stock Integer stock level (>= 0).
 * @module models/Product
 */
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    stock: { type: Number, required: true, min: 0, validate: Number.isInteger },
  },
  {
    timestamps: true, // Ajoute createdAt et updatedAt
  },
);

module.exports = mongoose.model('Product', productSchema);
