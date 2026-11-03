const axios = require('axios');
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
    console.warn('Notification delivery failed; the database change remains committed.');
  }
};
