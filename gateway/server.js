require('dotenv').config();
const { logger, requestLogger } = require('./logger');
const express = require('express');
const helmet = require('helmet');
const serviceAuth = require('./serviceAuth');
const app = express();
app.use(requestLogger);
app.disable('x-powered-by');
app.use(helmet());
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use(serviceAuth);
app.use(express.json({ limit: '32kb' }));
app.use('/notify', require('./routes/notifi'));
app.use('/update-stock', require('./routes/stock'));
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  logger.warn('Request could not be processed', { errorName: error.name });
  const status =
    error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 502;
  res.status(status).json({ message: 'Request could not be processed.' });
});
app.listen(process.env.GATEWAY_PORT || 8000, () =>
  logger.info('Gateway ready', { port: Number(process.env.GATEWAY_PORT || 8000) }),
);
