const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const enabled = process.env.RUN_INTEGRATION === '1';

test(
  'full-stack security and checkout regression suite',
  { skip: !enabled, timeout: 120000 },
  async (t) => {
    assert.ok(
      process.env.MONGO_URI.includes('/exam1AuditTest?'),
      'Integration tests require the isolated test database',
    );
    await mongoose.connect(process.env.MONGO_URI);
    const prefix = `audit-${Date.now()}`;
    const users = [],
      products = [];
    const password = 'A-long-test-password-123';
    const base = process.env.TEST_BASE_URL;
    async function request(
      path,
      { method = 'GET', body, auth, csrf = true, headers = {}, raw } = {},
    ) {
      const response = await fetch(path.startsWith('http') ? path : base + path, {
        method,
        signal: AbortSignal.timeout(12000),
        headers: {
          'Content-Type': 'application/json',
          ...(path === '/api/orders' && method === 'POST'
            ? { 'Idempotency-Key': randomUUID() }
            : {}),
          ...(auth
            ? { Cookie: auth.cookie, ...(csrf ? { 'X-CSRF-Token': auth.csrfToken } : {}) }
            : {}),
          ...headers,
        },
        ...(body !== undefined || raw !== undefined ? { body: raw ?? JSON.stringify(body) } : {}),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      return { status: response.status, data, headers: response.headers };
    }
    async function login(user) {
      const result = await request('/api/auth/login', {
        method: 'POST',
        body: { username: user.username, password },
      });
      assert.equal(result.status, 200, JSON.stringify(result.data));
      return {
        cookie: result.headers.get('set-cookie').split(';')[0],
        csrfToken: result.data.csrfToken,
        result,
      };
    }
    async function product(stock = 10) {
      const doc = await Product.create({
        name: prefix,
        description: 'Temporary audit fixture',
        price: 19.95,
        stock,
      });
      products.push(doc._id);
      return doc;
    }
    const orderBody = (product, quantity = 1) => ({
      items: [{ productId: String(product._id), quantity }],
      shippingAddress: { street: '1 Test', city: 'Paris', postalCode: '75001', country: 'France' },
      paymentMethod: 'Carte bancaire',
      shippingMethod: 'colissimo',
    });
    let owner, other, admin, ownerAuth, otherAuth, adminAuth;
    try {
      await t.test(
        'register validates input and prevents duplicate accounts and role escalation',
        async () => {
          const body = { username: prefix, email: `${prefix}@example.invalid`, password };
          assert.equal((await request('/api/auth/register', { method: 'POST', body })).status, 201);
          owner = await User.findOne({ username: prefix });
          users.push(owner._id);
          assert.equal(owner.role, 'user');
          assert.equal(owner.password, undefined);
          assert.equal((await request('/api/auth/register', { method: 'POST', body })).status, 409);
          assert.equal(
            (
              await request('/api/auth/register', {
                method: 'POST',
                body: { ...body, role: 'admin' },
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request('/api/auth/login', {
                method: 'POST',
                body: { username: { $ne: null }, password },
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request('/api/auth/register', {
                method: 'POST',
                body: { ...body, password: 'short' },
              })
            ).status,
            400,
          );
          assert.equal(
            (await request('/api/auth/register', { method: 'POST', raw: '{' })).status,
            400,
          );
          assert.equal(
            (
              await request('/api/auth/register', {
                method: 'POST',
                body: { ...body, padding: 'x'.repeat(40000) },
              })
            ).status,
            413,
          );
          other = await User.create({
            username: `${prefix}-other`,
            email: `${prefix}-other@example.invalid`,
            password,
          });
          users.push(other._id);
          admin = await User.create({
            username: `${prefix}-admin`,
            email: `${prefix}-admin@example.invalid`,
            password,
            role: 'admin',
          });
          users.push(admin._id);
        },
      );
      await t.test(
        'sessions use HttpOnly cookies, generic login failures, CSRF and origin protection',
        async () => {
          const bad = await request('/api/auth/login', {
            method: 'POST',
            body: { username: owner.username, password: 'wrong' },
          });
          const unknown = await request('/api/auth/login', {
            method: 'POST',
            body: { username: 'unknown', password: 'wrong' },
          });
          assert.equal(bad.status, 401);
          assert.deepEqual(bad.data, unknown.data);
          ownerAuth = await login(owner);
          otherAuth = await login(other);
          adminAuth = await login(admin);
          assert.match(ownerAuth.result.headers.get('set-cookie'), /HttpOnly/i);
          assert.match(ownerAuth.result.headers.get('set-cookie'), /SameSite=Lax/i);
          assert.equal(ownerAuth.result.data.token, undefined);
          assert.equal(
            (await request('/api/auth/me', { auth: ownerAuth })).data.user.username,
            owner.username,
          );
          assert.equal((await request('/api/auth/me')).status, 401);
          assert.equal(
            (await request('/api/auth/me', { auth: { ...ownerAuth, cookie: 'session=forged' } }))
              .status,
            401,
          );
          assert.equal(
            (await request('/api/auth/logout', { method: 'POST', auth: ownerAuth, csrf: false }))
              .status,
            403,
          );
          assert.equal(
            (
              await request('/api/auth/logout', {
                method: 'POST',
                auth: ownerAuth,
                headers: { 'X-CSRF-Token': 'é'.repeat(64) },
              })
            ).status,
            403,
          );
          assert.equal(
            (
              await request('/api/auth/login', {
                method: 'POST',
                headers: { Origin: 'https://evil.invalid' },
                body: { username: owner.username, password },
              })
            ).status,
            403,
          );
          const expired = jwt.sign({ version: 0, csrf: 'x' }, process.env.JWT_SECRET, {
            subject: String(owner._id),
            issuer: 'exam1',
            audience: 'exam1-web',
            expiresIn: -1,
          });
          assert.equal(
            (
              await request('/api/auth/me', {
                auth: { ...ownerAuth, cookie: `session=${expired}` },
              })
            ).status,
            401,
          );
          const p = await product();
          assert.equal(
            (
              await request(`/api/products/${p._id}/stock`, {
                method: 'PUT',
                auth: ownerAuth,
                body: { stock: 0 },
              })
            ).status,
            403,
          );
          await User.updateOne({ _id: admin._id }, { role: 'user' });
          assert.equal(
            (
              await request(`/api/products/${p._id}/stock`, {
                method: 'PUT',
                auth: adminAuth,
                body: { stock: 0 },
              })
            ).status,
            403,
          );
          await User.updateOne({ _id: admin._id }, { role: 'admin' });
        },
      );
      await t.test(
        'checkout rejects tampering, invalid quantities and incomplete data',
        async () => {
          const p = await product();
          for (const body of [
            { ...orderBody(p), total: 0.01 },
            { ...orderBody(p), items: [{ productId: String(p._id), quantity: 1, price: 0.01 }] },
            orderBody(p, -1),
            orderBody(p, 0),
            orderBody(p, 0.5),
            orderBody(p, '1'),
            { ...orderBody(p), shippingAddress: {} },
            { ...orderBody(p), items: [...orderBody(p).items, ...orderBody(p).items] },
          ])
            assert.equal(
              (await request('/api/orders', { method: 'POST', auth: ownerAuth, body })).status,
              400,
            );
          assert.equal((await Product.findById(p._id)).stock, 10);
          assert.equal(
            (await request('/api/orders', { method: 'POST', body: orderBody(p) })).status,
            401,
          );
        },
      );
      await t.test('failed multi-product orders roll back all stock changes', async () => {
        const p = await product();
        const body = orderBody(p);
        body.items.push({ productId: 'ffffffffffffffffffffffff', quantity: 1 });
        assert.equal(
          (await request('/api/orders', { method: 'POST', auth: ownerAuth, body })).status,
          409,
        );
        assert.equal((await Product.findById(p._id)).stock, 10);
        assert.equal(await Order.countDocuments({ 'items.productId': p._id }), 0);
      });
      await t.test('concurrent checkout cannot oversell and uses database prices', async () => {
        const p = await product(3);
        const results = await Promise.all(
          [1, 2].map(() =>
            request('/api/orders', { method: 'POST', auth: ownerAuth, body: orderBody(p, 2) }),
          ),
        );
        assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
        const order = results.find((result) => result.status === 201).data.order;
        assert.equal(order.total, 39.9);
        assert.equal(order.items[0].price, 19.95);
        assert.equal((await Product.findById(p._id)).stock, 1);
        assert.equal(await Order.countDocuments({ 'items.productId': p._id }), 1);
        assert.equal(
          (await request(`/api/orders/${order._id}`, { method: 'DELETE', auth: otherAuth })).status,
          404,
        );
        assert.equal((await request('/api/orders', { auth: otherAuth })).data.length, 0);
        const cancellation = await request(`/api/orders/${order._id}`, {
          method: 'DELETE',
          auth: ownerAuth,
        });
        assert.equal(cancellation.status, 200);
        assert.equal(cancellation.data.order.status, 'Annulée');
        assert.equal(
          (await request(`/api/orders/${order._id}`, { method: 'DELETE', auth: ownerAuth })).status,
          200,
        );
        assert.equal((await Product.findById(p._id)).stock, 3);
        assert.ok(await Order.findById(order._id));
      });
      await t.test(
        'retrying the same checkout key cannot duplicate an order or reserve stock twice',
        async () => {
          const p = await product(10);
          const headers = { 'Idempotency-Key': randomUUID() };
          const body = orderBody(p, 2);
          const results = await Promise.all(
            [1, 2].map(() =>
              request('/api/orders', { method: 'POST', auth: ownerAuth, headers, body }),
            ),
          );
          assert.deepEqual(results.map((result) => result.status).sort(), [200, 201]);
          assert.equal(results[0].data.order._id, results[1].data.order._id);
          assert.equal((await Product.findById(p._id)).stock, 8);
          assert.equal(
            (
              await request('/api/orders', {
                method: 'POST',
                auth: ownerAuth,
                headers,
                body: orderBody(p, 3),
              })
            ).status,
            409,
          );
          assert.equal(await Order.countDocuments({ 'items.productId': p._id }), 1);
        },
      );
      await t.test(
        'admin order validation persists, status transitions and IDs are checked',
        async () => {
          const p = await product();
          const result = await request('/api/orders', {
            method: 'POST',
            auth: ownerAuth,
            body: orderBody(p),
          });
          assert.equal(result.status, 201);
          const id = result.data.order._id;
          assert.equal(
            (
              await request(`/api/orders/${id}/status`, {
                method: 'PUT',
                auth: ownerAuth,
                body: { status: 'Expédiée' },
              })
            ).status,
            403,
          );
          assert.equal(
            (
              await request(`/api/orders/${id}/status`, {
                method: 'PUT',
                auth: adminAuth,
                body: { status: 'Expédiée' },
              })
            ).status,
            409,
          );
          assert.equal(
            (await request(`/api/orders/${id}/validate`, { method: 'PUT', auth: adminAuth }))
              .status,
            200,
          );
          assert.equal((await Order.findById(id)).status, 'En cours de traitement');
          assert.equal(
            (
              await request(`/api/orders/${id}/status`, {
                method: 'PUT',
                auth: adminAuth,
                body: { status: 'invalid' },
              })
            ).status,
            400,
          );
          assert.equal(
            (await request('/api/orders/not-an-id/validate', { method: 'PUT', auth: adminAuth }))
              .status,
            400,
          );
          assert.equal(
            (
              await request(`/api/orders/${id}/status`, {
                method: 'PUT',
                auth: adminAuth,
                body: { status: 'Expédiée' },
              })
            ).status,
            200,
          );
          assert.equal(
            (await request(`/api/orders/${id}`, { method: 'DELETE', auth: ownerAuth })).status,
            403,
          );
          assert.equal(
            (await request(`/api/orders/${id}`, { method: 'DELETE', auth: adminAuth })).status,
            409,
          );
          assert.equal(
            (
              await request(`/api/orders/${id}/status`, {
                method: 'PUT',
                auth: adminAuth,
                body: { status: 'Délivrée' },
              })
            ).status,
            200,
          );
        },
      );
      await t.test('stock service persists administrator updates including zero', async () => {
        const p = await product();
        const path = `/api/products/${p._id}/stock`;
        for (const stock of [-1, 0.5, '0', null])
          assert.equal(
            (await request(path, { method: 'PUT', auth: adminAuth, body: { stock } })).status,
            400,
          );
        const result = await request(path, { method: 'PUT', auth: adminAuth, body: { stock: 0 } });
        assert.equal(result.status, 200);
        assert.equal(result.data.product.stock, 0);
        assert.equal(result.data.product.name, prefix);
        assert.equal((await Product.findById(p._id)).stock, 0);
        assert.equal(
          (await request('/api/orders', { method: 'POST', auth: ownerAuth, body: orderBody(p) }))
            .status,
          409,
        );
        assert.equal(
          (
            await request('/api/products/not-an-id/stock', {
              method: 'PUT',
              auth: adminAuth,
              body: { stock: 1 },
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request('/api/products/ffffffffffffffffffffffff/stock', {
              method: 'PUT',
              auth: adminAuth,
              body: { stock: 1 },
            })
          ).status,
          404,
        );
      });
      await t.test(
        'internal endpoints require service authentication and validate payloads',
        async () => {
          for (const url of [
            'http://gateway:8000/notify',
            'http://notifications:4002/notify',
            'http://stock-management:4003/update-stock',
          ]) {
            assert.equal((await request(url, { method: 'POST', body: {} })).status, 401);
          }
          const headers = { 'X-Service-Token': process.env.SERVICE_TOKEN };
          assert.equal(
            (await request('http://gateway:8000/notify', { method: 'POST', headers, body: {} }))
              .status,
            400,
          );
          const email = {
            to: 'test@example.invalid',
            subject: 'Test',
            text: 'Testing with mail disabled',
          };
          const result = await request('http://gateway:8000/notify', {
            method: 'POST',
            headers,
            body: email,
          });
          assert.equal(result.status, 202);
          assert.equal(result.data.delivered, false);
          assert.equal(
            (
              await request('http://gateway:8000/notify', {
                method: 'POST',
                headers,
                body: { ...email, subject: 'x\r\nBcc: x' },
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request('http://gateway:8000/update-stock', {
                method: 'POST',
                headers,
                body: { productId: 'bad', stock: -1 },
              })
            ).status,
            400,
          );
        },
      );
      await t.test('SPA routes, response headers and logout revocation work', async () => {
        const index = await request('/');
        assert.equal(index.status, 200);
        assert.equal((await request('/shipping-payment')).data, index.data);
        assert.ok(index.headers.get('content-security-policy'));
        assert.equal(index.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(
          (await request('/api/auth/logout', { method: 'POST', auth: ownerAuth })).status,
          204,
        );
        assert.equal((await request('/api/auth/me', { auth: ownerAuth })).status, 401);
      });
      await t.test(
        'empty forms and HTML/JS registration input are rejected through HTTP',
        async () => {
          for (const path of ['/api/auth/register', '/api/auth/login']) {
            assert.equal((await request(path, { method: 'POST', body: {} })).status, 400);
          }
          for (const username of [
            "alert('test')",
            "<script>alert('test')</script>",
            '<img src=x onerror=alert(1)>',
          ]) {
            assert.equal(
              (
                await request('/api/auth/register', {
                  method: 'POST',
                  body: { username, email: 'injection@example.invalid', password },
                })
              ).status,
              400,
            );
          }
          assert.equal(await User.countDocuments({ email: 'injection@example.invalid' }), 0);
        },
      );
      await t.test(
        'CORS permits the configured UI and refuses hostile browser writes',
        async () => {
          const allowed = await request('/api/products', {
            headers: { Origin: 'http://localhost:3000' },
          });
          assert.equal(allowed.status, 200);
          assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3000');
          assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
          const denied = await request('/api/products', {
            headers: { Origin: 'https://evil.invalid' },
          });
          assert.equal(denied.headers.get('access-control-allow-origin'), null);
          const preflight = await request('/api/orders', {
            method: 'OPTIONS',
            headers: {
              Origin: 'http://localhost:3000',
              'Access-Control-Request-Method': 'POST',
              'Access-Control-Request-Headers': 'content-type,x-csrf-token',
            },
          });
          assert.equal(preflight.status, 204);
          assert.equal(
            preflight.headers.get('access-control-allow-origin'),
            'http://localhost:3000',
          );
          for (const Origin of ['https://evil.invalid', 'null']) {
            assert.equal(
              (
                await request('/api/auth/register', {
                  method: 'POST',
                  headers: { Origin },
                  body: {},
                })
              ).status,
              403,
            );
          }
        },
      );
      await t.test('all order and stock mutation endpoints reject anonymous requests', async () => {
        const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
        for (const [method, path] of [
          ['PUT', `/api/orders/${id}/status`],
          ['PUT', `/api/orders/${id}/validate`],
          ['DELETE', `/api/orders/${id}`],
          ['PUT', `/api/products/${id}/stock`],
        ]) {
          assert.equal((await request(path, { method, body: {} })).status, 401);
        }
      });
      await t.test('authentication attempts are rate-limited', async () => {
        let blocked = false;
        for (let attempt = 0; attempt < 25; attempt++) {
          const result = await request('/api/auth/login', {
            method: 'POST',
            body: { username: 'unknown', password: 'wrong' },
          });
          if (result.status === 429) {
            blocked = true;
            break;
          }
          assert.equal(result.status, 401);
        }
        assert.equal(blocked, true);
      });
    } finally {
      await Order.deleteMany({ userId: { $in: users } });
      await Product.deleteMany({ _id: { $in: products } });
      await User.deleteMany({ _id: { $in: users } });
      await mongoose.disconnect();
    }
  },
);
