const axios = require('axios');
const Product = require('../models/Product');
const { fail } = require('../utils/http');
const { notify } = require('../utils/notifications');
/**
 * GET /api/products: public catalogue (max 1000 products).
 * @param {import('express').Request} req
 * @param {import('express').Response} res 200 array of products.
 * @returns {Promise<void>}
 */
exports.getProducts = async (req, res) => res.json(await Product.find().limit(1000));
/**
 * PUT /api/products/:productId/stock (admin): set a product's absolute stock level.
 * The write is delegated to the stock microservice through the gateway using the
 * shared `X-Service-Token`; the admin is then notified by email (best-effort).
 * @param {import('express').Request} req Params: `productId`; body: `{ stock }`.
 * @param {import('express').Response} res 200 `{ message, product }`; 404 if unknown; 503 if the stock service is down.
 * @returns {Promise<void>}
 */
exports.updateProductStock = async (req, res) => {
  let response;
  try {
    response = await axios.post(
      `${process.env.GATEWAY_URL || 'http://localhost:8000'}/update-stock`,
      {
        productId: req.params.productId,
        stock: req.body.stock,
      },
      { headers: { 'X-Service-Token': process.env.SERVICE_TOKEN }, timeout: 3000 },
    );
  } catch (error) {
    if (error.response?.status === 404) throw fail(404, 'Produit introuvable.');
    throw fail(503, 'Service de stock indisponible.');
  }
  await notify(
    process.env.NOTIFICATION_EMAIL,
    'Mise à jour du stock',
    `Stock du produit ${req.params.productId} : ${req.body.stock}.`,
  );
  res.json({ message: 'Stock mis à jour.', product: response.data.product });
};
