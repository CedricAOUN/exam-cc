/** Origins allowed by CORS and the Origin check, from the comma-separated `ALLOWED_ORIGINS`. */
const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((value) => value.trim());
/** Options for the session cookie: httpOnly, SameSite=Lax, Secure when `COOKIE_SECURE=true`. */
const cookieOptions = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax',
  path: '/api',
};
/**
 * Fail fast at startup if required configuration is missing or weak.
 * @throws {Error} If `JWT_SECRET`/`SERVICE_TOKEN` are shorter than 32 chars or still the example placeholder, or `MONGO_URI` is unset.
 */
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
