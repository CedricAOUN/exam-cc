const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((value) => value.trim());
const cookieOptions = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax',
  path: '/api',
};
function validateConfig() {
  for (const key of ['JWT_SECRET', 'SERVICE_TOKEN']) {
    if (
      !process.env[key] ||
      process.env[key].length < 32 ||
      process.env[key].startsWith('replace-with-')
    ) {
      throw new Error(`${key} must contain at least 32 characters`);
    }
  }
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
}
module.exports = { origins, cookieOptions, validateConfig };
