const { createLogger, format, transports, config } = require('winston');

// Keep this small module local so each service can build independently.
const allowed = new Set([
  'errorName',
  'errorCode',
  'method',
  'route',
  'status',
  'durationMs',
  'port',
  'productCount',
]);
const safeMetadata = format((info) => {
  for (const key of Object.keys(info)) {
    if (!['level', 'message'].includes(key) && !allowed.has(key)) delete info[key];
  }
  return info;
});
const logger = createLogger({
  level: Object.hasOwn(config.npm.levels, process.env.LOG_LEVEL || '')
    ? process.env.LOG_LEVEL
    : 'info',
  format: format.combine(
    safeMetadata(),
    format((info) => {
      info.service = 'notifications';
      return info;
    })(),
    format.timestamp(),
    format.json(),
  ),
  transports: [new transports.Console({ stderrLevels: ['error'] })],
});

/** Log completion metadata only: never bodies, headers, query strings or raw URLs. */
function requestLogger(req, res, next) {
  const started = process.hrtime.bigint();
  res.once('finish', () => {
    if (req.path === '/health' && res.statusCode < 400) return;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, 'HTTP request completed', {
      method: req.method,
      route:
        typeof req.route?.path === 'string'
          ? `${req.baseUrl || ''}${req.route.path}`
          : '<unmatched>',
      status: res.statusCode,
      durationMs: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
    });
  });
  next();
}

function fatal(message, error) {
  logger.error(message, { errorName: error?.name });
  // Let the transports finish before terminating a failed startup.
  logger.once('finish', () => process.exit(1));
  logger.end();
}
module.exports = { logger, requestLogger, fatal };
