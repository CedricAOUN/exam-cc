require('dotenv').config();
const { logger, requestLogger, fatal } = require('./logger');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const { origins, validateConfig } = require('./config/security');
const connectDB = require('./config/db');
const app = express();
app.use(requestLogger);
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);
app.use(helmet());
app.use(cors({ origin: origins, credentials: true }));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.get('Origin') &&
    !origins.includes(req.get('Origin'))
  ) {
    return res.status(403).json({ message: 'Origine interdite.' });
  }
  next();
});
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.get('/health', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' });
});
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use((req, res) => res.status(404).json({ message: 'Route introuvable.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === 11000) return res.status(409).json({ message: 'Ce compte existe déjà.' });
  if (['ValidationError', 'CastError'].includes(error.name) || error.type === 'entity.parse.failed')
    return res.status(400).json({ message: 'Données invalides.' });
  if (error.type === 'entity.too.large')
    return res.status(413).json({ message: 'Requête trop volumineuse.' });
  if (error.status && error.status < 500)
    return res.status(error.status).json({ message: error.message });
  logger.error('Request failed', { errorName: error.name, errorCode: error.code });
  res
    .status(error.status === 503 ? 503 : 500)
    .json({ message: 'Service indisponible. Réessayez plus tard.' });
});
async function start() {
  validateConfig();
  await connectDB();
  // Build unique indexes before accepting concurrent registrations.
  await Promise.all([
    require('./models/User').init(),
    require('./models/Product').init(),
    require('./models/Order').init(),
  ]);
  return app.listen(process.env.PORT || 5000, () =>
    logger.info('API ready', { port: Number(process.env.PORT || 5000) }),
  );
}
if (require.main === module)
  start().catch((error) => {
    fatal('API startup failed', error);
  });
module.exports = { app, start };
