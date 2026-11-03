const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const fail = (status, message) => Object.assign(new Error(message), { status });
module.exports = { asyncHandler, fail };
