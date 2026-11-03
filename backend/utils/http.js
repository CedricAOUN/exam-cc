/**
 * Wrap an async route handler so rejected promises reach Express's error handler.
 * @param {Function} handler Async `(req, res, next)` handler.
 * @returns {express.RequestHandler}
 */
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
/**
 * Create an Error carrying an HTTP status, to be `throw`n from handlers.
 * @param {number} status HTTP status code.
 * @param {string} message Message returned to the client (for statuses below 500).
 * @returns {Error}
 */
const fail = (status, message) => Object.assign(new Error(message), { status });
module.exports = { asyncHandler, fail };
