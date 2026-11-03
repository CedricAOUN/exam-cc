const mongoose = require('mongoose');

/**
 * @module models/Order
 * Mongoose model for customer orders. Orders carry an immutable idempotency
 * `checkoutKey`/`requestHash` pair (unique per user) so a retried checkout
 * never creates a duplicate order.
 */

/**
 * Sub-schema for a single order line.
 * @typedef {Object} OrderItem
 * @property {import('mongoose').Types.ObjectId} productId Referenced Product.
 * @property {number} quantity Positive integer.
 * @property {number} price Unit price at order time (>= 0).
 */
const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the product in your database
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Au moins 1 produit est requis'],
    validate: Number.isInteger,
  },
  price: {
    min: 0,
    type: Number,
    required: true,
  },
});

/**
 * @typedef {Object} OrderDocument
 * @property {string} [checkoutKey] Idempotency key supplied by the client.
 * @property {string} [requestHash] Hash of the request body bound to the key.
 * @property {boolean} stockReserved Whether stock was already decremented.
 * @property {import('mongoose').Types.ObjectId} userId Owner of the order.
 * @property {OrderItem[]} items Ordered lines.
 * @property {number} total Order total (>= 0).
 * @property {'En attente'|'En cours de traitement'|'Expédiée'|'Délivrée'|'Annulée'} status
 * @property {{street:string,city:string,postalCode:string,country:string}} shippingAddress
 * @property {'Carte bancaire'|'PayPal'|'Virement'} paymentMethod
 * @property {'colissimo'|'chronopost'} shippingMethod
 */
const orderSchema = new mongoose.Schema(
  {
    checkoutKey: { type: String, immutable: true },
    requestHash: { type: String, immutable: true },
    stockReserved: { type: Boolean, default: false },
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the user in your database
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema], // Array of order items
    total: {
      min: 0,
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['En attente', 'En cours de traitement', 'Expédiée', 'Délivrée', 'Annulée'],
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
      enum: ['Carte bancaire', 'PayPal', 'Virement'],
      required: true,
    },
    shippingMethod: {
      type: String,
      enum: ['colissimo', 'chronopost'],
      required: true,
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
  },
);

orderSchema.index(
  { userId: 1, checkoutKey: 1 },
  {
    unique: true,
    partialFilterExpression: { checkoutKey: { $type: 'string' } },
  },
);

// Create the model
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
