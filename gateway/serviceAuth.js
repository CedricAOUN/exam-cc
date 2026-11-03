const { timingSafeEqual } = require('node:crypto');
const expected = process.env.SERVICE_TOKEN;
if (!expected || expected.length < 32 || expected.startsWith('replace-with-'))
  throw new Error('SERVICE_TOKEN must contain at least 32 characters');
module.exports = (req, res, next) => {
  const supplied = Buffer.from(req.get('X-Service-Token') || '');
  const required = Buffer.from(expected);
  if (supplied.length !== required.length || !timingSafeEqual(supplied, required))
    return res.status(401).json({ message: 'Service authentication required.' });
  next();
};
