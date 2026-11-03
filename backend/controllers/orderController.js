const mongoose = require('mongoose');
const { createHash } = require('node:crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { fail } = require('../utils/http');
const { notify } = require('../utils/notifications');

/**
 * POST /api/orders: create an order atomically.
 * Runs in a MongoDB transaction: stock is decremented per item (failing with 409
 * if insufficient) and prices are read from the database, never from the client.
 * The required `Idempotency-Key` header makes retries safe: replaying the same key
 * with the same payload returns the existing order (200); a different payload is a 409.
 * A confirmation email is sent best-effort after commit.
 * @param {import('express').Request} req Body: `{ items, shippingAddress, paymentMethod, shippingMethod }`.
 * @param {import('express').Response} res 201 (created) or 200 (replayed) with `{ message, order }`.
 * @returns {Promise<void>}
 */
exports.createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod, shippingMethod } = req.body;
  const checkoutKey = req.get('Idempotency-Key');
  const requestHash = createHash('sha256')
    .update(JSON.stringify({ items, shippingAddress, paymentMethod, shippingMethod }))
    .digest('hex');
  const replay = (order) => {
    if (order.requestHash !== requestHash)
      throw fail(409, 'Cette clé de commande a déjà été utilisée.');
    return { order, replayed: true };
  };
  let result;
  try {
    result = await mongoose.connection.transaction(async (session) => {
      const existing = await Order.findOne({ userId: req.user._id, checkoutKey }).session(session);
      if (existing) return replay(existing);
      const details = [];
      let cents = 0;
      // Sequential operations are required within a MongoDB transaction.
      for (const { productId, quantity } of items) {
        const product = await Product.findOneAndUpdate(
          { _id: productId, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { new: true, session },
        );
        if (!product) throw fail(409, 'Produit indisponible ou stock insuffisant.');
        const priceCents = Math.round(product.price * 100);
        if (!Number.isSafeInteger(priceCents) || priceCents < 0)
          throw fail(409, 'Prix du produit invalide.');
        cents += priceCents * quantity;
        if (!Number.isSafeInteger(cents)) throw fail(400, 'Montant de commande invalide.');
        details.push({ productId, quantity, price: priceCents / 100 });
      }
      const [order] = await Order.create(
        [
          {
            userId: req.user._id,
            checkoutKey,
            requestHash,
            stockReserved: true,
            items: details,
            total: cents / 100,
            shippingAddress,
            paymentMethod,
            shippingMethod,
          },
        ],
        { session },
      );
      return { order, replayed: false };
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const existing = await Order.findOne({ userId: req.user._id, checkoutKey });
    if (!existing) throw error;
    result = replay(existing);
  }
  if (!result.replayed)
    await notify(
      req.user.email,
      'Commande confirmée',
      `Votre commande ${result.order._id} a été créée.`,
    );
  res.status(result.replayed ? 200 : 201).json({ message: 'Commande créée.', order: result.order });
};

/**
 * GET /api/orders: list orders, newest first (max 200).
 * Admins see every order; other users only see their own.
 * @param {import('express').Request} req Requires `authenticateToken`.
 * @param {import('express').Response} res 200 array of orders.
 * @returns {Promise<void>}
 */
exports.getOrders = async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
  res.json(await Order.find(filter).sort({ createdAt: -1 }).limit(200));
};

/** Allowed order status transitions: current status -> permitted next statuses. */
const transitions = {
  'En attente': ['En cours de traitement', 'Annulée'],
  'En cours de traitement': ['Expédiée', 'Annulée'],
  Expédiée: ['Délivrée'],
  Délivrée: [],
  Annulée: [],
};
/**
 * Move an order to a new status inside a transaction.
 * Enforces ownership (non-admins only touch their own orders and may only cancel
 * while `En attente`), validates the transition, and restores reserved stock
 * exactly once on cancellation.
 * @param {import('express').Request} req Uses `req.params.orderId` and `req.user`.
 * @param {string} status Target status.
 * @returns {Promise<{order: object, changed: boolean}>} `changed` is false if already in that status.
 * @throws {Error} With `status` 404, 403 or 409 (see `utils/http.fail`).
 */
async function changeStatus(req, status) {
  return mongoose.connection.transaction(async (session) => {
    const filter = { _id: req.params.orderId };
    if (req.user.role !== 'admin') filter.userId = req.user._id;
    const order = await Order.findOne(filter).session(session);
    if (!order) throw fail(404, 'Commande introuvable.');
    if (order.status === status) return { order, changed: false };
    if (req.user.role !== 'admin' && order.status !== 'En attente')
      throw fail(403, 'Cette commande ne peut plus être annulée.');
    if (!transitions[order.status]?.includes(status))
      throw fail(409, 'Transition de statut interdite.');
    if (status === 'Annulée' && order.stockReserved) {
      for (const { productId, quantity } of order.items) {
        const result = await Product.updateOne(
          { _id: productId },
          { $inc: { stock: quantity } },
          { session },
        );
        if (!result.matchedCount)
          throw fail(409, 'Produit introuvable pour la restitution du stock.');
      }
    }
    if (status === 'Annulée') order.stockReserved = false;
    order.status = status;
    await order.save({ session });
    return { order, changed: true };
  });
}
/**
 * Apply a status change, email the order owner if it changed, and reply with the order.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} status Target status.
 * @returns {Promise<void>}
 */
async function respondStatus(req, res, status) {
  const { order, changed } = await changeStatus(req, status);
  if (changed) {
    const user = await User.findById(order.userId).select('email');
    await notify(
      user?.email,
      'Mise à jour de commande',
      `Votre commande ${order._id} : ${order.status}.`,
    );
  }
  res.json({ message: 'Commande mise à jour.', order });
}
// Keep order history; DELETE cancels and restores stock exactly once.
exports.deleteOrder = (req, res) => respondStatus(req, res, 'Annulée');
exports.validateOrder = (req, res) => respondStatus(req, res, 'En cours de traitement');
exports.updateOrderStatus = (req, res) => respondStatus(req, res, req.body.status);
