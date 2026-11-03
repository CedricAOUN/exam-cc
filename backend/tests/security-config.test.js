const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateConfig } = require('../config/security');

test('configuration rejects missing, short and example JWT/service secrets', () => {
  const keys = ['JWT_SECRET', 'SERVICE_TOKEN', 'MONGO_URI'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.MONGO_URI = 'mongodb://localhost/test';
    for (const key of ['JWT_SECRET', 'SERVICE_TOKEN']) {
      for (const value of [
        '',
        'short',
        'a'.repeat(31),
        'replace-with-a-random-secret-at-least-32-characters',
      ]) {
        process.env.JWT_SECRET = 'a'.repeat(64);
        process.env.SERVICE_TOKEN = 'b'.repeat(64);
        process.env[key] = value;
        assert.throws(validateConfig, new RegExp(key));
      }
    }
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.SERVICE_TOKEN = 'b'.repeat(64);
    assert.doesNotThrow(validateConfig);
    delete process.env.MONGO_URI;
    assert.throws(validateConfig, /MONGO_URI/);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
