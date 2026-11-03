const mongoose = require('mongoose');
const { logger } = require('../logger');
module.exports = async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  logger.info('MongoDB connected');
};
