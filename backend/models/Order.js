const mongoose = require('mongoose');

// Define the schema for individual order items
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

// Define the schema for the entire order
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
