require('dotenv').config();
const { logger, requestLogger, fatal } = require('./logger');
const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const Joi = require('joi');
const serviceAuth = require('./serviceAuth');
const app = express();
const Product = mongoose.model(
  'Product',
  new mongoose.Schema(
    {
      stock: { type: Number, min: 0, validate: Number.isInteger },
    },
    { strict: true, timestamps: true },
  ),
  'products',
);
app.use(requestLogger);
app.disable('x-powered-by');
app.use(helmet());
app.get('/health', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' });
});
app.use(serviceAuth);
app.use(express.json({ limit: '32kb' }));
const schema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  stock: Joi.number().integer().min(0).max(1000000).required(),
});
app.post('/update-stock', async (req, res, next) => {
  const { value, error } = schema.required().validate(req.body, { convert: false });
  if (error) return res.status(400).json({ message: 'Invalid stock update.' });
  try {
    // Return the whole product while only permitting stock changes.
    const product = await Product.findByIdAndUpdate(
      value.productId,
      { $set: { stock: value.stock } },
      { new: true, runValidators: true },
    ).lean();
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json({ product });
  } catch (error) {
    next(error);
  }
});
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  logger.warn('Request could not be processed', { errorName: error.name });
  const status =
    error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 503;
  res.status(status).json({ message: 'Stock request failed.' });
});
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() =>
    app.listen(process.env.PORT || 4003, () =>
      logger.info('Stock service ready', { port: Number(process.env.PORT || 4003) }),
    ),
  )
  .catch((error) => fatal('Stock database connection failed.', error));
