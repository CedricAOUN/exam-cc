const express = require('express');
const controller = require('../controllers/productController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');
const { schemas, validate, Joi, id } = require('../middlewares/validation');
const { asyncHandler } = require('../utils/http');
const router = express.Router();
router.get('/', asyncHandler(controller.getProducts));
router.put(
  '/:productId/stock',
  authenticateToken,
  isAdmin,
  validate(Joi.object({ productId: id }), 'params'),
  validate(schemas.stock),
  asyncHandler(controller.updateProductStock),
);
module.exports = router;
