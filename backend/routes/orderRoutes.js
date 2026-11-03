const express = require('express');
const controller = require('../controllers/orderController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');
const { schemas, validate, Joi, id } = require('../middlewares/validation');
const { asyncHandler } = require('../utils/http');
const router = express.Router();
router.use(authenticateToken);
router.get('/', asyncHandler(controller.getOrders));
router.post(
  '/',
  (req, res, next) => {
    if (!/^[a-zA-Z0-9-]{16,64}$/.test(req.get('Idempotency-Key') || ''))
      return res.status(400).json({ message: 'Clé de commande requise.' });
    next();
  },
  validate(schemas.order),
  asyncHandler(controller.createOrder),
);
router.use('/:orderId', validate(Joi.object({ orderId: id }), 'params'));
router.delete('/:orderId', asyncHandler(controller.deleteOrder));
router.put('/:orderId/validate', isAdmin, asyncHandler(controller.validateOrder));
router.put(
  '/:orderId/status',
  isAdmin,
  validate(schemas.status),
  asyncHandler(controller.updateOrderStatus),
);
module.exports = router;
