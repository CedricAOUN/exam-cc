const mongoose = require('mongoose');
const { logger } = require('../logger');
/**
 * Connect Mongoose to `MONGO_URI` (10 s server-selection timeout).
 * @returns {Promise<void>} Rejects if the database is unreachable.
 */
module.exports = async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  logger.info('MongoDB connected');
};
