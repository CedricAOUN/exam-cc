const axios = require('axios');
const { logger } = require('../logger');
/**
 * Send an email through the gateway's notification service (best-effort).
 * Does nothing without a recipient; delivery failures are logged without request
 * details and never thrown, so a mail outage cannot roll back an order.
 * @param {string|undefined} to Recipient address.
 * @param {string} subject Email subject.
 * @param {string} text Plain-text body.
 * @returns {Promise<void>}
 */
exports.notify = async (to, subject, text) => {
  if (!to) return;
  try {
    await axios.post(
      `${process.env.GATEWAY_URL || 'http://localhost:8000'}/notify`,
      { to, subject, text },
      {
        headers: { 'X-Service-Token': process.env.SERVICE_TOKEN },
        timeout: 3000,
      },
    );
  } catch {
    // Never log request configs: they contain service credentials and personal data.
    logger.warn('Notification delivery failed; the database change remains committed.');
  }
};
