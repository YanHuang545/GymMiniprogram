'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const { expirePending, hydrate } = require('../src/hydrate');
const { createRouter } = require('../src/routes');
const { defaultStore, createPool } = require('./mock-db');

const OLD_MS = Date.now() - 20 * 60 * 1000;
const ROOT = path.join(__dirname, '..');

function pendingOrder(extra) {
  return Object.assign(
    {
      id: 'OOLD',
      user_id: 'U001',
      status: 'pending_payment',
      created_at: OLD_MS,
      amount: 99,
      refund_amount: 0,
      title: '燃脂操',
      when_text: '',
      place: '',
      kind: 'group',
      session_id: 'S001',
      package_id: null,
      camp_id: null,
      venue_id: null,
      activity_id: null,
      coach_id: null,
      act_date: null,
      start_hm: null,
      end_hm: null,
      store_id: 'ST001',
      cover: '',
      duration_min: 60,
      coupon_id: null,
      cancel_hours: 6
    },
    extra || {}
  );
}

function startServer(pool) {
  const app = express();
  app.use(express.json());
  app.use('/api', createRouter(pool));
  app.use(function (req, res) {
    res.status(404).json({
      ok: false,
      error: 'Route ' + req.method + ' ' + req.url + ' not found'
    });
  });
  app.use(function (err, req, res, next) {
    res.status(err.statusCode || 500).json({ ok: false, error: err.message });
  });
  return new Promise(function (resolve) {
    const server = app.listen(0, '127.0.0.1', function () {
      resolve(server);
    });
  });
}

function request(server, method, urlPath, opts) {
  opts = opts || {};
  return new Promise(function (resolve, reject) {
    const addr = server.address();
    const data = opts.body ? JSON.stringify(opts.body) : '';
    const headers = {
      'content-type': 'application/json',
      'X-User-Id': opts.userId || 'U001'
    };
    if (opts.openId) headers['X-Open-Id'] = opts.openId;
    if (data) headers['content-length'] = Buffer.byteLength(data);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path: urlPath,
        method: method,
        headers: headers
      },
      function (res) {
        let raw = '';
        res.on('data', function (c) {
          raw += c;
        });
        res.on('end', function () {
          let parsed = raw;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch (e) {}
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const checkoutBody = {
  kind: 'group',
  sessionId: 'S001',
  title: '燃脂操',
  when: '后天 18:00',
  place: '朝阳店',
  price: 99,
  durationMin: 60,
  storeId: 'ST001'
};

describe('booking concurrency helpers', function () {
  it('expirePending twice does not double-decrement a group session', async function () {
    const store = defaultStore();
    store.sessions[0].booked = 5;
    store.orders.push(pendingOrder());
    const pool = createPool(store);
    await Promise.all([expirePending(pool), expirePending(pool)]);
    assert.equal(store.orders[0].status, 'closed');
    assert.equal(store.sessions[0].booked, 4);
  });

  it('expirePending releases camp and activity holds and is idempotent', async function () {
    const store = defaultStore();
    store.camps[0].booked = 3;
    store.activities[0].booked = 2;
    store.orders.push(
      pendingOrder({
        id: 'OCAMP',
        kind: 'camp',
        session_id: null,
        camp_id: 'M001'
      })
    );
    store.orders.push(
      pendingOrder({
        id: 'OACT',
        kind: 'activity',
        session_id: null,
        activity_id: 'A001'
      })
    );
    const pool = createPool(store);
    await expirePending(pool);
    await expirePending(pool);
    assert.equal(store.camps[0].booked, 2);
    assert.equal(store.activities[0].booked, 1);
    assert.equal(store.orders[0].status, 'closed');
    assert.equal(store.orders[1].status, 'closed');
  });

  it('hydrate GET path does not expire pending or decrement booked', async function () {
    const store = defaultStore();
    store.sessions[0].booked = 5;
    store.orders.push(pendingOrder());
    const pool = createPool(store);
    await hydrate(pool, 'U001');
    assert.equal(store.orders[0].status, 'pending_payment');
    assert.equal(store.sessions[0].booked, 5);
  });
});

describe('checkout / pay / inventory HTTP', function () {
  let server;
  let pool;
  let store;

  before(async function () {
    store = defaultStore();
    pool = createPool(store);
    server = await startServer(pool);
  });

  after(async function () {
    await new Promise(function (resolve) {
      server.close(resolve);
    });
  });

  it('same user second checkout returns existing pending and does not booked+1', async function () {
    const first = await request(server, 'POST', '/api/checkout', { body: checkoutBody, userId: 'U001' });
    assert.equal(first.status, 201);
    const bookedAfterFirst = store.sessions[0].booked;
    const second = await request(server, 'POST', '/api/checkout', { body: checkoutBody, userId: 'U001' });
    assert.ok(second.status === 200 || second.status === 201);
    assert.equal(second.body.ok, true);
    assert.equal(second.body.data.id, first.body.data.id);
    assert.equal(store.sessions[0].booked, bookedAfterFirst);
    const pending = store.orders.filter(function (o) {
      return o.user_id === 'U001' && o.status === 'pending_payment' && o.session_id === 'S001';
    });
    assert.equal(pending.length, 1);
  });

  it('GET /checkout does not create a hold', async function () {
    const before = store.orders.length;
    const booked = store.sessions[0].booked;
    const res = await request(server, 'GET', '/api/checkout?kind=group&sessionId=S001');
    assert.equal(res.status, 404);
    assert.equal(store.orders.length, before);
    assert.equal(store.sessions[0].booked, booked);
  });
});

describe('last seat race', function () {
  it('two checkouts for the last seat: only one holds inventory', async function () {
    const store = defaultStore();
    store.sessions[0].booked = 4;
    store.sessions[0].capacity = 5;
    const pool = createPool(store, { yieldOnSelect: true });
    const server = await startServer(pool);
    try {
      const [a, b] = await Promise.all([
        request(server, 'POST', '/api/checkout', { body: checkoutBody, userId: 'U001' }),
        request(server, 'POST', '/api/checkout', { body: checkoutBody, userId: 'U002' })
      ]);
      const statuses = [a.status, b.status].sort();
      assert.deepEqual(statuses, [201, 409]);
      assert.equal(store.sessions[0].booked, 5);
      const pending = store.orders.filter(function (o) {
        return o.status === 'pending_payment' && o.session_id === 'S001';
      });
      assert.equal(pending.length, 1);
    } finally {
      await new Promise(function (resolve) {
        server.close(resolve);
      });
    }
  });

  it('checkout retries ER_LOCK_DEADLOCK twice and still holds the last seat', async function () {
    const store = defaultStore();
    store.sessions[0].booked = 4;
    const pool = createPool(store, { deadlockOnInventory: 2 });
    const server = await startServer(pool);
    try {
      const res = await request(server, 'POST', '/api/checkout', { body: checkoutBody, userId: 'U001' });
      assert.equal(res.status, 201);
      assert.equal(store.sessions[0].booked, 5);
    } finally {
      await new Promise(function (resolve) {
        server.close(resolve);
      });
    }
  });
});

describe('coupon occupy, private slots, join-free, refund, logout', function () {
  it('pending checkout occupies coupon so a second order cannot share it', async function () {
    const store = defaultStore();
    const pool = createPool(store);
    const server = await startServer(pool);
    try {
      const body = Object.assign({}, checkoutBody, { couponId: 'CP001' });
      const first = await request(server, 'POST', '/api/checkout', { body: body, userId: 'U001' });
      assert.equal(first.status, 201);
      const second = await request(server, 'POST', '/api/checkout', {
        body: { kind: 'camp', campId: 'M001', title: '训练营', price: 199, couponId: 'CP001' },
        userId: 'U001'
      });
      assert.equal(second.status, 409);
      const used = store.orders.filter(function (o) {
        return o.coupon_id === 'CP001' && o.status === 'pending_payment';
      });
      assert.equal(used.length, 1);
    } finally {
      await new Promise(function (resolve) {
        server.close(resolve);
      });
    }
  });

  it('two users cannot book the same coach hour', async function () {
    const store = defaultStore();
    const pool = createPool(store);
    const server = await startServer(pool);
    try {
      store.owned_packages.push({
        id: 'OP002',
        user_id: 'U002',
        package_id: 'P002',
        name: '周期课包 10 节',
        total: 10,
        remain: 2,
        expire_offset: 70,
        expire_date: '2099-01-01'
      });
      const payload = { coachId: 'C001', date: '2099-06-01', start: '10:00' };
      const first = await request(server, 'POST', '/api/slots/confirm', { body: payload, userId: 'U001' });
      assert.equal(first.status, 200);
      const second = await request(server, 'POST', '/api/slots/confirm', { body: payload, userId: 'U002' });
      assert.equal(second.status, 409);
    } finally {
      await new Promise(function (resolve) {
        server.close(resolve);
      });
    }
  });

  it('private slot rejects expired owned_packages even if remain>0', async function () {
    const store = defaultStore();
    store.owned_packages[0].expire_date = '2020-01-01';
    const pool = createPool(store);
    const server = await startServer(pool);
    try {
      const res = await request(server, 'POST', '/api/slots/confirm', {
        body: { coachId: 'C001', date: '2099-06-01', start: '11:00' },
        userId: 'U001'
      });
      assert.equal(res.status, 409);
    } finally {
      await new Promise(function (resolve) {
        server.close(resolve);
      });
    }
  });

  it('join-free rejects duplicate upcoming signup', async function () {
    const store = defaultStore();
    const pool = createPool(store);
    const server = await startServer(pool);
    try {
      const first = await request(server, 'POST', '/api/activities/A001/join-free', { userId: 'U001' });
      assert.equal(first.status, 200);
      const booked = store.activities[0].booked;
      const second = await request(server, 'POST', '/api/activities/A001/join-free', { userId: 'U001' });
      assert.equal(second.status, 409);
      assert.equal(store.activities[0].booked, booked);
    } finally {
      await new Promise(function (resolve) {
        server.close(resolve);
      });
    }
  });

  it('cancel refunds inside the transaction and GET pay does not pay pending', async function () {
    const store = defaultStore();
    store.sessions[0].booked = 4;
    const pool = createPool(store);
    const server = await startServer(pool);
    try {
      const created = await request(server, 'POST', '/api/checkout', { body: checkoutBody, userId: 'U001' });
      const orderId = created.body.data.id;
      const peek = await request(server, 'GET', '/api/orders/' + orderId + '/pay', { userId: 'U001' });
      assert.ok(peek.status === 200 || peek.status === 409);
      assert.equal(store.orders[0].status, 'pending_payment');
      const paid = await request(server, 'POST', '/api/orders/' + orderId + '/pay', { userId: 'U001' });
      assert.equal(paid.status, 200);
      const again = await request(server, 'POST', '/api/orders/' + orderId + '/pay', { userId: 'U001' });
      assert.equal(again.status, 200);
      const booking = store.bookings.find(function (b) {
        return b.order_id === orderId;
      });
      assert.ok(booking);
      const cancelled = await request(server, 'POST', '/api/bookings/' + booking.id + '/cancel', {
        userId: 'U001'
      });
      assert.equal(cancelled.status, 200);
      const order = store.orders.find(function (o) {
        return o.id === orderId;
      });
      assert.equal(order.status, 'refunded');
    } finally {
      await new Promise(function (resolve) {
        server.close(resolve);
      });
    }
  });

  it('demo logout does not reset store-wide booked counters', async function () {
    const store = defaultStore();
    store.sessions[0].booked = 7;
    store.sessions[0].seed_booked = 2;
    store.camps[0].booked = 4;
    store.camps[0].seed_booked = 1;
    store.activities[0].booked = 6;
    store.activities[0].seed_booked = 0;
    const pool = createPool(store);
    const server = await startServer(pool);
    try {
      const res = await request(server, 'POST', '/api/logout', { userId: 'U001' });
      assert.equal(res.status, 200);
      assert.equal(store.sessions[0].booked, 7);
      assert.equal(store.camps[0].booked, 4);
      assert.equal(store.activities[0].booked, 6);
    } finally {
      await new Promise(function (resolve) {
        server.close(resolve);
      });
    }
  });
});

describe('frontend retry and timezone boot', function () {
  it('biz.js retries POST checkout/pay on reset and never GET-creates checkout', function () {
    const src = fs.readFileSync(path.join(ROOT, '../frontend/utils/biz.js'), 'utf8');
    assert.equal(/api\.get\(\s*'\/api\/checkout'/.test(src), false);
    assert.equal((src.match(/api\.post\(\s*'\/api\/checkout'/g) || []).length >= 2, true);
    assert.equal(/api\.get\(\s*'\/api\/orders\/' \+ order\.id \+ '\/pay'/.test(src), false);
    assert.equal((src.match(/api\.post\(\s*'\/api\/orders\/' \+ order\.id \+ '\/pay'/g) || []).length >= 2, true);
  });

  it('index.js sets Asia/Shanghai TZ before loading routes', function () {
    const src = fs.readFileSync(path.join(ROOT, 'src/index.js'), 'utf8');
    const tz = src.indexOf("process.env.TZ = 'Asia/Shanghai'");
    const routes = src.indexOf("require('./routes')");
    assert.ok(tz >= 0);
    assert.ok(tz < routes);
  });
});
