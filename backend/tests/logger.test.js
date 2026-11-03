const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const probe = `
const { EventEmitter } = require('node:events');
const { logger, requestLogger } = require('./logger');
logger.info('Logger probe', { port: 5000, password: 'SENSITIVE_PROBE', headers: { authorization: 'SENSITIVE_PROBE' }, error: new Error('SENSITIVE_PROBE') });
const req = { method: 'PUT', baseUrl: '/api/orders', path: '/api/orders/SENSITIVE_PROBE', originalUrl: '/api/orders/SENSITIVE_PROBE?token=SENSITIVE_PROBE', route: { path: '/:orderId/status' }, headers: { cookie: 'SENSITIVE_PROBE' }, body: { password: 'SENSITIVE_PROBE' }, query: { token: 'SENSITIVE_PROBE' } };
const response = new EventEmitter(); response.statusCode = 403;
requestLogger(req, response, () => {}); response.emit('finish');
for (const status of [200, 503]) {
  const health = new EventEmitter(); health.statusCode = status;
  requestLogger({ method: 'GET', path: '/health', route: { path: '/health' } }, health, () => {});
  health.emit('finish');
}
logger.end();
`;
function run(level = 'info') {
  const env = { ...process.env, LOG_LEVEL: level };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['-e', probe], {
    cwd: path.resolve(__dirname, '..'),
    env,
    encoding: 'utf8',
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  const output = result.stdout + result.stderr;
  assert.ok(!output.includes('SENSITIVE_PROBE'), 'Sensitive request data must not appear in logs');
  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
test('logger emits safe structured logs and skips successful health checks', () => {
  const entries = run();
  assert.equal(entries.length, 3);
  for (const entry of entries) {
    assert.equal(entry.service, 'backend');
    assert.ok(Number.isFinite(Date.parse(entry.timestamp)));
  }
  const request = entries.find((entry) => entry.status === 403);
  assert.equal(request.level, 'warn');
  assert.equal(request.method, 'PUT');
  assert.equal(request.route, '/api/orders/:orderId/status');
  assert.ok(request.durationMs >= 0);
  assert.equal(entries.find((entry) => entry.status === 503).level, 'error');
});
test('LOG_LEVEL filters lower levels and invalid values fall back to info', () => {
  const entries = run('error');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].level, 'error');
  assert.equal(run('invalid-level').length, 3);
});
test('fatal startup logging flushes a safe error record before exiting', () => {
  const result = spawnSync(
    process.execPath,
    ['-e', "require('./logger').fatal('Startup failed', new Error('SENSITIVE_PROBE'))"],
    {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, LOG_LEVEL: 'info' },
      encoding: 'utf8',
      timeout: 3000,
    },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  const output = result.stdout + result.stderr;
  assert.ok(!output.includes('SENSITIVE_PROBE'));
  const entry = JSON.parse(output.trim());
  assert.equal(entry.level, 'error');
  assert.equal(entry.message, 'Startup failed');
  assert.equal(entry.errorName, 'Error');
});
