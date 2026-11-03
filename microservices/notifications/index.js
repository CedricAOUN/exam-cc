require('dotenv').config();
const { logger, requestLogger } = require('./logger');
const express = require('express');
const helmet = require('helmet');
const Joi = require('joi');
const nodemailer = require('nodemailer');
const serviceAuth = require('./serviceAuth');
const app = express();
app.use(requestLogger);
app.disable('x-powered-by');
app.use(helmet());
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use(serviceAuth);
app.use(express.json({ limit: '32kb' }));
const schema = Joi.object({
  to: Joi.string()
    .email({ tlds: { allow: false } })
    .max(254)
    .required(),
  subject: Joi.string()
    .max(200)
    .pattern(/^[^\r\n]+$/)
    .required(),
  text: Joi.string().max(10000).required(),
});
const enabled = Boolean(process.env.EMAIL_USER && process.env.EMAIL_APPLICATION_PASSWORD);
const transporter = enabled
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APPLICATION_PASSWORD },
      connectionTimeout: 2000,
      greetingTimeout: 2000,
      socketTimeout: 2500,
      disableFileAccess: true,
      disableUrlAccess: true,
    })
  : null;
app.post('/notify', async (req, res) => {
  const { value, error } = schema.required().validate(req.body, { convert: false });
  if (error) return res.status(400).json({ message: 'Invalid notification.' });
  if (!enabled)
    return res.status(202).json({ delivered: false, message: 'Email delivery disabled.' });
  try {
    await transporter.sendMail({ from: process.env.EMAIL_USER, ...value });
    res.json({ delivered: true });
  } catch {
    logger.warn('Email delivery failed.');
    res.status(502).json({ message: 'Email delivery failed.' });
  }
});
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  logger.warn('Request could not be processed', { errorName: error.name });
  res.status(error.type === 'entity.too.large' ? 413 : 400).json({ message: 'Invalid request.' });
});
app.listen(process.env.NOTIFI_PORT || 4002, () =>
  logger.info('Notifications ready', { port: Number(process.env.NOTIFI_PORT || 4002) }),
);
