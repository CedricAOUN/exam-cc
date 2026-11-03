const { test } = require('node:test');
const assert = require('node:assert/strict');
const { schemas } = require('../middlewares/validation');
const check = (schema, body) => schema.required().validate(body, { convert: false });
test('registration rejects role injection, query objects, short and oversized passwords', () => {
  const valid = { username: 'tester', email: 'test@example.com', password: 'A-long-password-123' };
  assert.equal(check(schemas.register, valid).error, undefined);
  for (const input of [
    { ...valid, role: 'admin' },
    { ...valid, username: { $ne: null } },
    { ...valid, password: 'short' },
    { ...valid, password: 'é'.repeat(37) },
  ]) {
    assert.ok(check(schemas.register, input).error);
  }
});
test('checkout rejects client prices, duplicate products, coercion, and incomplete addresses', () => {
  const valid = {
    items: [{ productId: 'aaaaaaaaaaaaaaaaaaaaaaaa', quantity: 1 }],
    shippingAddress: { street: '1 Test', city: 'Paris', postalCode: '75001', country: 'France' },
    shippingMethod: 'colissimo',
    paymentMethod: 'Carte bancaire',
  };
  assert.equal(check(schemas.order, valid).error, undefined);
  for (const quantity of [0, -1, 1.5, '1', null, 1001]) {
    assert.ok(check(schemas.order, { ...valid, items: [{ ...valid.items[0], quantity }] }).error);
  }
  assert.ok(check(schemas.order, { ...valid, items: [{ ...valid.items[0], price: 0.01 }] }).error);
  assert.ok(check(schemas.order, { ...valid, total: 0 }).error);
  assert.ok(check(schemas.order, { ...valid, items: [...valid.items, ...valid.items] }).error);
  assert.ok(check(schemas.order, { ...valid, shippingAddress: {} }).error);
  assert.ok(check(schemas.order, undefined).error);
});
test('stock accepts numeric zero and rejects fractions, strings and negative values', () => {
  assert.equal(check(schemas.stock, { stock: 0 }).error, undefined);
  for (const stock of ['0', -1, 1.2, null, {}, 1000001])
    assert.ok(check(schemas.stock, { stock }).error);
});
