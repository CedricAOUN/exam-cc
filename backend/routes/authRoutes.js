const express = require('express');
const { rateLimit } = require('express-rate-limit');
const controller = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { schemas, validate } = require('../middlewares/validation');
const { asyncHandler } = require('../utils/http');
const router = express.Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez plus tard.' },
});
router.post('/login', limiter, validate(schemas.login), asyncHandler(controller.login));
router.post('/register', limiter, validate(schemas.register), asyncHandler(controller.register));
router.get('/me', authenticateToken, controller.me);
router.post('/logout', authenticateToken, asyncHandler(controller.logout));
module.exports = router;
