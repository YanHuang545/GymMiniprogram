const express = require('express');
const { hydrate, expirePending, didChange, mapOrder, mapBooking } = require('./hydrate');
const {
  uid,
  offsetDate,
  AppError,
  asyncHandler,
  ymd,
  today,
  addDays,
  isPastStart,
  shanghaiMillis
} = require('./ids');

function createRouter(pool) {
  const router = express.Router();

  const OSS_AVATAR =
    'https://mashangfei1112.oss-accelerate.aliyuncs.com/gym-demo/photos/avatar-user.jpg';

  async function one(exec, sql, params) {
    const [rows] = await exec.execute(sql, params);
    return rows[0] || null;
  }

  async function withTxn(fn) {
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const result = await fn(conn);
        await conn.commit();
        return result;
      } catch (e) {
        try {
          await conn.rollback();
        } catch (ignored) {}
        lastErr = e;
        if (e && e.code === 'ER_LOCK_DEADLOCK' && attempt < 2) continue;
        throw e;
      } finally {
        conn.release();
      }
    }
    throw lastErr;
  }

  async function occupyBooked(conn, table, id, fullMsg) {
    const [result] = await conn.execute(
      'UPDATE ' + table + ' SET booked = booked + 1 WHERE id = ? AND booked < capacity',
      [id]
    );
    if (!didChange(result)) throw new AppError(fullMsg, 409);
  }

  async function occupyCoupon(conn, couponId, userId, price) {
    const amount = Math.max(0, Number(price) || 0);
    if (!couponId) return amount;
    const c = await one(conn, 'SELECT * FROM coupons WHERE id = ? AND user_id = ? FOR UPDATE', [
      couponId,
      userId
    ]);
    if (!c || c.status !== 'unused') throw new AppError('优惠券不可用', 409);
    if (amount < Number(c.min_amount)) return amount;
    await conn.execute("UPDATE coupons SET status = 'used' WHERE id = ? AND user_id = ?", [
      couponId,
      userId
    ]);
    return Math.max(0, amount - Number(c.amount));
  }

  async function seedWelcomeCoupons(exec, userId) {
    await exec.execute(
      `INSERT INTO coupons (id, user_id, name, amount, min_amount, status, expire_offset)
       VALUES (?, ?, '新人券', 10, 50, 'unused', 30), (?, ?, '满减券', 20, 200, 'unused', 45)`,
      [uid('CP'), userId, uid('CP'), userId]
    );
  }

  async function findOrCreateByOpenid(exec, openId) {
    const existing = await one(exec, 'SELECT id FROM users WHERE openid = ?', [openId]);
    if (existing) {
      await exec.execute('UPDATE users SET last_login_at = ? WHERE id = ?', [Date.now(), existing.id]);
      return existing.id;
    }
    const id = uid('U');
    try {
      await exec.execute(
        `INSERT INTO users (
           id, openid, nickname, avatar, phone, authorized, notify_enabled,
           current_city, current_store_id, seen_auth, last_login_at
         ) VALUES (?, ?, '', ?, '', 0, 0, '北京', 'ST001', 0, ?)`,
        [id, openId, OSS_AVATAR, Date.now()]
      );
      await seedWelcomeCoupons(exec, id);
      return id;
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        const raced = await one(exec, 'SELECT id FROM users WHERE openid = ?', [openId]);
        if (raced) return raced.id;
      }
      throw err;
    }
  }

  async function ensureUser(exec, userId) {
    const [rows] = await exec.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (!rows[0]) {
      throw new AppError('用户不存在', 401);
    }
  }

  router.use(
    asyncHandler(async (req, res, next) => {
      req.openId = String(req.get('X-Open-Id') || '').trim();
      if (req.openId) {
        req.userId = await findOrCreateByOpenid(pool, req.openId);
        return next();
      }
      req.userId = req.get('X-User-Id') || 'U001';
      next();
    })
  );

  async function reuseCancelledBooking(conn, userId, whereSql, whereParams, row) {
    const old = await one(
      conn,
      `SELECT id FROM bookings WHERE user_id = ? AND status = 'cancelled' AND (${whereSql}) ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [userId].concat(whereParams)
    );
    if (!old) return null;
    await conn.execute(
      `UPDATE bookings SET
         status = 'upcoming', created_at = ?, duration_min = ?, order_id = ?, kind = ?, title = ?,
         act_date = ?, start_hm = ?, end_hm = ?, store_id = ?, session_id = ?, venue_id = ?,
         camp_id = ?, activity_id = ?, coach_id = ?, cover = ?, cancel_hours = ?
       WHERE id = ?`,
      [
        row.createdAt,
        row.durationMin,
        row.orderId,
        row.kind,
        row.title,
        row.date,
        row.start,
        row.end,
        row.storeId,
        row.sessionId,
        row.venueId,
        row.campId,
        row.activityId,
        row.coachId,
        row.cover,
        row.cancelHours,
        old.id
      ]
    );
    return old.id;
  }

  function overlaps(date, start, end, other) {
    if (other.status !== 'upcoming' || other.act_date !== date) return false;
    return !(end <= other.start_hm || start >= other.end_hm);
  }

  async function hasConflict(exec, userId, date, start, end, ignoreId) {
    const [rows] = await exec.execute(
      "SELECT id, status, act_date, start_hm, end_hm FROM bookings WHERE user_id = ? AND status = 'upcoming'",
      [userId]
    );
    return rows.some((b) => b.id !== ignoreId && overlaps(date, start, end, b));
  }

  router.get(
    '/bootstrap',
    asyncHandler(async (req, res) => {
      async function load() {
        await ensureUser(pool, req.userId);
        return hydrate(pool, req.userId);
      }
      let data;
      try {
        data = await load();
      } catch (err) {
        var retryable = err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ETIMEDOUT';
        if (!retryable) throw err;
        data = await load();
      }
      res.json({ ok: true, data: data });
    })
  );

  router.get(
    '/stores',
    asyncHandler(async (req, res) => {
      const data = await hydrate(pool, req.userId);
      res.json({ ok: true, data: data.stores });
    })
  );

  router.get(
    '/sessions',
    asyncHandler(async (req, res) => {
      const data = await hydrate(pool, req.userId);
      res.json({ ok: true, data: data.sessions });
    })
  );

  router.get(
    '/sessions/:id',
    asyncHandler(async (req, res) => {
      const data = await hydrate(pool, req.userId);
      const item = data.sessions.find((s) => s.id === req.params.id);
      if (!item) throw new AppError('课程不存在', 404);
      res.json({ ok: true, data: item });
    })
  );

  router.post(
    '/auth/agree',
    asyncHandler(async (req, res) => {
      const nickname = String((req.body && req.body.nickname) || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 32);
      const avatar = String((req.body && req.body.avatar) || '').trim().slice(0, 512);
      const persistAvatar = /^(https:\/\/|cloud:\/\/)/.test(avatar);
      if (persistAvatar && nickname) {
        await pool.execute(
          'UPDATE users SET authorized = 1, nickname = ?, avatar = ?, seen_auth = 1 WHERE id = ?',
          [nickname, avatar, req.userId]
        );
      } else if (persistAvatar) {
        await pool.execute(
          'UPDATE users SET authorized = 1, avatar = ?, seen_auth = 1 WHERE id = ?',
          [avatar, req.userId]
        );
      } else if (nickname) {
        await pool.execute(
          'UPDATE users SET authorized = 1, nickname = ?, seen_auth = 1 WHERE id = ?',
          [nickname, req.userId]
        );
      } else {
        await pool.execute(
          'UPDATE users SET authorized = 1, seen_auth = 1 WHERE id = ?',
          [req.userId]
        );
      }
      res.json({ ok: true, data: await hydrate(pool, req.userId) });
    })
  );

  router.post(
    '/auth/skip',
    asyncHandler(async (req, res) => {
      await pool.execute('UPDATE users SET seen_auth = 1 WHERE id = ?', [req.userId]);
      res.json({ ok: true, data: await hydrate(pool, req.userId) });
    })
  );

  router.post(
    '/auth/phone',
    asyncHandler(async (req, res) => {
      const phone = String((req.body && req.body.phone) || '13800138000');
      await pool.execute('UPDATE users SET phone = ? WHERE id = ?', [phone, req.userId]);
      res.json({ ok: true, data: await hydrate(pool, req.userId) });
    })
  );

  router.post(
    '/user/store',
    asyncHandler(async (req, res) => {
      const storeId = req.body && req.body.storeId;
      const city = req.body && req.body.city;
      if (storeId) {
        const st = await one(pool, 'SELECT id, city FROM stores WHERE id = ?', [storeId]);
        if (!st) throw new AppError('门店不存在', 404);
        await pool.execute('UPDATE users SET current_store_id = ?, current_city = ? WHERE id = ?', [
          st.id,
          st.city,
          req.userId
        ]);
      } else if (city) {
        await pool.execute('UPDATE users SET current_city = ? WHERE id = ?', [city, req.userId]);
      }
      res.json({ ok: true, data: await hydrate(pool, req.userId) });
    })
  );

  router.post(
    '/user/notify',
    asyncHandler(async (req, res) => {
      await pool.execute('UPDATE users SET notify_enabled = 1 WHERE id = ?', [req.userId]);
      res.json({ ok: true, data: await hydrate(pool, req.userId) });
    })
  );

  router.post(
    '/logout',
    asyncHandler(async (req, res) => {
      if (req.openId) {
        await pool.execute('UPDATE users SET authorized = 0 WHERE id = ?', [req.userId]);
        res.json({ ok: true, data: await hydrate(pool, req.userId) });
        return;
      }
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute('DELETE FROM bookings WHERE user_id = ?', [req.userId]);
        await conn.execute('DELETE FROM payments WHERE user_id = ?', [req.userId]);
        await conn.execute('DELETE FROM orders WHERE user_id = ?', [req.userId]);
        await conn.execute('DELETE FROM enterprise_leads WHERE user_id = ?', [req.userId]);
        await conn.execute('DELETE FROM owned_packages WHERE user_id = ?', [req.userId]);
        await conn.execute("UPDATE coupons SET status = 'unused' WHERE user_id = ?", [req.userId]);
        await conn.execute(
          `INSERT INTO owned_packages (id, user_id, package_id, name, total, remain, expire_offset)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ['OP001', req.userId, 'P002', '周期课包 10 节', 10, 3, 70]
        );
        await conn.execute(
          `UPDATE users SET nickname = '', phone = '', authorized = 0, notify_enabled = 0,
           current_city = '北京', current_store_id = 'ST001', seen_auth = 0 WHERE id = ?`,
          [req.userId]
        );
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
      res.json({ ok: true, data: await hydrate(pool, req.userId) });
    })
  );

  async function checkoutAction(req, res) {
    const ck = Object.assign({}, req.body || {});
    if (ck.payType === 'times') {
      throw new AppError('课包预约请走时段确认', 400);
    }
    const out = await withTxn(async function (conn) {
      await expirePending(conn);
      await ensureUser(conn, req.userId);

      if (ck.kind === 'group') {
        const s = await one(conn, 'SELECT * FROM sessions WHERE id = ? FOR UPDATE', [ck.sessionId]);
        if (!s) throw new AppError('课程不存在', 404);
        const existing = await one(
          conn,
          "SELECT * FROM orders WHERE user_id = ? AND status = 'pending_payment' AND session_id = ? FOR UPDATE",
          [req.userId, s.id]
        );
        if (existing) return { status: 200, order: existing };
        if (Number(s.booked) >= Number(s.capacity)) throw new AppError('名额刚满', 409);
        const dup = await one(
          conn,
          "SELECT id FROM bookings WHERE user_id = ? AND session_id = ? AND status = 'upcoming'",
          [req.userId, s.id]
        );
        if (dup) throw new AppError('不能重复预约同一节课', 409);
        const date = offsetDate(s.date_offset);
        if (isPastStart(date, s.start_hm)) {
          throw new AppError('这节课已经过期', 409);
        }
        if (await hasConflict(conn, req.userId, date, s.start_hm, s.end_hm)) {
          throw new AppError('这个时间你已经有课了，先取消原来那节', 409);
        }
        ck.date = ck.date || date;
        ck.start = ck.start || s.start_hm;
        ck.end = ck.end || s.end_hm;
        await occupyBooked(conn, 'sessions', s.id, '名额刚满');
      }

      if (ck.kind === 'camp') {
        const m = await one(conn, 'SELECT * FROM camps WHERE id = ? FOR UPDATE', [ck.campId]);
        if (!m) throw new AppError('训练营不存在', 404);
        const existing = await one(
          conn,
          "SELECT * FROM orders WHERE user_id = ? AND status = 'pending_payment' AND camp_id = ? FOR UPDATE",
          [req.userId, m.id]
        );
        if (existing) return { status: 200, order: existing };
        if (Number(m.booked) >= Number(m.capacity)) throw new AppError('已满员', 409);
        await occupyBooked(conn, 'camps', m.id, '已满员');
      }

      if (ck.kind === 'activity') {
        const a = await one(conn, 'SELECT * FROM activities WHERE id = ? FOR UPDATE', [ck.activityId]);
        if (!a) throw new AppError('活动不存在', 404);
        const existing = await one(
          conn,
          "SELECT * FROM orders WHERE user_id = ? AND status = 'pending_payment' AND activity_id = ? FOR UPDATE",
          [req.userId, a.id]
        );
        if (existing) return { status: 200, order: existing };
        if (a.status === 'ended') throw new AppError('已结束', 409);
        if (Number(a.booked) >= Number(a.capacity)) throw new AppError('已满', 409);
        await occupyBooked(conn, 'activities', a.id, '已满');
      }

      const amount = await occupyCoupon(conn, ck.couponId, req.userId, ck.price);
      const id = uid('O');
      const now = Date.now();
      await conn.execute(
        `INSERT INTO orders (
           id, user_id, status, created_at, amount, refund_amount, title, when_text, place, kind,
           session_id, package_id, camp_id, venue_id, activity_id, coach_id, act_date, start_hm, end_hm,
           store_id, cover, duration_min, coupon_id, cancel_hours
         ) VALUES (?, ?, 'pending_payment', ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          req.userId,
          now,
          amount,
          ck.title || '',
          ck.when || '',
          ck.place || '',
          ck.kind || 'group',
          ck.sessionId || null,
          ck.packageId || null,
          ck.campId || null,
          ck.venueId || null,
          ck.activityId || null,
          ck.coachId || null,
          ck.date || null,
          ck.start || null,
          ck.end || null,
          ck.storeId || null,
          ck.cover || null,
          Number(ck.durationMin) || 60,
          ck.couponId || null,
          Number(ck.cancelHours) || 6
        ]
      );
      await conn.execute(
        `INSERT INTO payments (id, user_id, order_id, amount, paid_at, channel)
         VALUES (?, ?, ?, ?, ?, 'wechat_mock')`,
        [uid('PAY'), req.userId, id, amount, now]
      );
      const order = await one(conn, 'SELECT * FROM orders WHERE id = ?', [id]);
      return { status: 201, order: order };
    });
    res.status(out.status).json({ ok: true, data: mapOrder(out.order) });
  }

  router.post('/checkout', asyncHandler(checkoutAction));

  async function payAction(req, res) {
    const out = await withTxn(async function (conn) {
      await expirePending(conn);
      const order = await one(conn, 'SELECT * FROM orders WHERE id = ? AND user_id = ? FOR UPDATE', [
        req.params.id,
        req.userId
      ]);
      if (!order) throw new AppError('订单不存在', 404);
      if (order.status === 'paid') return order;
      if (order.status !== 'pending_payment') throw new AppError('订单状态不可支付', 409);
        await conn.execute("UPDATE orders SET status = 'paid' WHERE id = ?", [order.id]);
        if (order.coupon_id) {
          await conn.execute("UPDATE coupons SET status = 'used' WHERE id = ? AND user_id = ?", [
            order.coupon_id,
            req.userId
          ]);
        }
        if (['group', 'venue', 'activity', 'camp'].indexOf(order.kind) >= 0) {
          const match = [];
          const matchParams = [];
          if (order.session_id) {
            match.push('session_id = ?');
            matchParams.push(order.session_id);
          } else if (order.venue_id) {
            match.push('venue_id = ?');
            matchParams.push(order.venue_id);
          } else if (order.camp_id) {
            match.push('camp_id = ?');
            matchParams.push(order.camp_id);
          } else if (order.activity_id) {
            match.push('activity_id = ?');
            matchParams.push(order.activity_id);
          }
          const bookingRow = {
            createdAt: Date.now(),
            durationMin: order.duration_min || 60,
            orderId: order.id,
            kind: order.kind,
            title: order.title,
            date: order.act_date,
            start: order.start_hm,
            end: order.end_hm,
            storeId: order.store_id,
            sessionId: order.session_id,
            venueId: order.venue_id,
            campId: order.camp_id,
            activityId: order.activity_id,
            coachId: order.coach_id,
            cover: order.cover,
            cancelHours: order.cancel_hours || 6
          };
          const reused = match.length
            ? await reuseCancelledBooking(conn, req.userId, match.join(' AND '), matchParams, bookingRow)
            : null;
          if (!reused) {
            await conn.execute(
              `INSERT INTO bookings (
                 id, user_id, status, created_at, duration_min, order_id, kind, title, act_date, start_hm, end_hm,
                 store_id, session_id, venue_id, camp_id, activity_id, coach_id, cover, cancel_hours
               ) VALUES (?, ?, 'upcoming', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                uid('BK'),
                req.userId,
                bookingRow.createdAt,
                bookingRow.durationMin,
                bookingRow.orderId,
                bookingRow.kind,
                bookingRow.title,
                bookingRow.date,
                bookingRow.start,
                bookingRow.end,
                bookingRow.storeId,
                bookingRow.sessionId,
                bookingRow.venueId,
                bookingRow.campId,
                bookingRow.activityId,
                bookingRow.coachId,
                bookingRow.cover,
                bookingRow.cancelHours
              ]
            );
          }
        }
        if (order.kind === 'package' && order.package_id) {
          const pkg = await one(conn, 'SELECT * FROM packages WHERE id = ?', [order.package_id]);
          if (pkg) {
            await conn.execute(
              `INSERT INTO owned_packages (id, user_id, package_id, name, total, remain, expire_offset, expire_date)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                uid('OP'),
                req.userId,
                pkg.id,
                pkg.name,
                pkg.sessions,
                pkg.sessions,
                pkg.valid_days,
                ymd(addDays(today(), Number(pkg.valid_days) || 30))
              ]
            );
          }
        }
        const fresh = await one(conn, 'SELECT * FROM orders WHERE id = ?', [order.id]);
        return fresh;
    });
    res.json({ ok: true, data: mapOrder(out) });
  }

  router.post('/orders/:id/pay', asyncHandler(payAction));
  router.get(
    '/orders/:id/pay',
    asyncHandler(async (req, res) => {
      const order = await one(pool, 'SELECT * FROM orders WHERE id = ? AND user_id = ?', [
        req.params.id,
        req.userId
      ]);
      if (!order) throw new AppError('订单不存在', 404);
      if (order.status === 'paid') {
        res.json({ ok: true, data: mapOrder(order) });
        return;
      }
      throw new AppError('订单状态不可支付', 409);
    })
  );

  router.post(
    '/slots/confirm',
    asyncHandler(async (req, res) => {
      const body = req.body || {};
      const coachId = body.coachId;
      const date = body.date;
      const start = body.start;
      if (!coachId || !date || !start) throw new AppError('请选择时段', 400);
      if (isPastStart(date, start)) throw new AppError('这节课已经过期', 409);
      const hour = Number(String(start).split(':')[0]);
      const end = String(hour + 1).padStart(2, '0') + ':00';
      const out = await withTxn(async function (conn) {
        await expirePending(conn);
        const coach = await one(conn, 'SELECT * FROM coaches WHERE id = ? FOR UPDATE', [coachId]);
        if (!coach) throw new AppError('教练不存在', 404);
        const store = await one(conn, 'SELECT * FROM stores WHERE id = ?', [coach.store_id]);
        const taken = await one(
          conn,
          "SELECT id FROM bookings WHERE coach_id = ? AND act_date = ? AND start_hm = ? AND status = 'upcoming'",
          [coachId, date, start]
        );

        if (body.rescheduleId) {
          const old = await one(conn, 'SELECT * FROM bookings WHERE id = ? AND user_id = ? FOR UPDATE', [
            body.rescheduleId,
            req.userId
          ]);
          if (!old) throw new AppError('预约不存在', 404);
          if (taken && taken.id !== old.id) throw new AppError('该时段已被预约', 409);
          if (await hasConflict(conn, req.userId, date, start, end, old.id)) {
            throw new AppError('这个时间你已经有课了', 409);
          }
          await conn.execute(
            'UPDATE bookings SET act_date = ?, start_hm = ?, end_hm = ? WHERE id = ?',
            [date, start, end, old.id]
          );
          const fresh = await one(conn, 'SELECT * FROM bookings WHERE id = ?', [old.id]);
          return { type: 'reschedule', booking: mapBooking(fresh) };
        }

        if (taken) throw new AppError('该时段已被预约', 409);
        if (await hasConflict(conn, req.userId, date, start, end)) {
          throw new AppError('这个时间你已经有课了', 409);
        }
        const pack = await one(
          conn,
          'SELECT * FROM owned_packages WHERE user_id = ? AND remain > 0 AND (expire_date IS NULL OR expire_date >= ?) ORDER BY id LIMIT 1 FOR UPDATE',
          [req.userId, ymd(today())]
        );
        if (!pack) throw new AppError('需要先买课包', 409);
        await conn.execute('UPDATE owned_packages SET remain = remain - 1 WHERE id = ?', [pack.id]);
        const now = Date.now();
        const orderId = uid('O');
        const title = '私教 · ' + coach.name;
        await conn.execute(
          `INSERT INTO orders (
             id, user_id, status, created_at, amount, refund_amount, title, when_text, place, kind,
             coach_id, act_date, start_hm, end_hm, store_id, cover, duration_min, cancel_hours
           ) VALUES (?, ?, 'paid', ?, 0, 0, ?, ?, ?, 'private', ?, ?, ?, ?, ?, ?, 60, 6)`,
          [
            orderId,
            req.userId,
            now,
            title,
            date.slice(5).replace('-', '月') + '日 ' + start,
            store ? store.name : '',
            coach.id,
            date,
            start,
            end,
            coach.store_id,
            coach.avatar
          ]
        );
        const bookingRow = {
          createdAt: now,
          durationMin: 60,
          orderId: orderId,
          kind: 'private',
          title: title,
          date: date,
          start: start,
          end: end,
          storeId: coach.store_id,
          sessionId: null,
          venueId: null,
          campId: null,
          activityId: null,
          coachId: coach.id,
          cover: coach.avatar,
          cancelHours: 6
        };
        const reused = await reuseCancelledBooking(
          conn,
          req.userId,
          'coach_id = ? AND act_date = ? AND start_hm = ?',
          [coach.id, date, start],
          bookingRow
        );
        if (!reused) {
          await conn.execute(
            `INSERT INTO bookings (
               id, user_id, status, created_at, duration_min, order_id, kind, title, act_date, start_hm, end_hm,
               store_id, coach_id, cover, cancel_hours
             ) VALUES (?, ?, 'upcoming', ?, 60, ?, 'private', ?, ?, ?, ?, ?, ?, ?, 6)`,
            [uid('BK'), req.userId, now, orderId, title, date, start, end, coach.store_id, coach.id, coach.avatar]
          );
        }
        const order = await one(conn, 'SELECT * FROM orders WHERE id = ?', [orderId]);
        return { type: 'book', order: mapOrder(order) };
      });
      res.json({ ok: true, data: out });
    })
  );

  router.post(
    '/bookings/:id/cancel',
    asyncHandler(async (req, res) => {
      const out = await withTxn(async function (conn) {
        await expirePending(conn);
        const peek = await one(conn, 'SELECT * FROM bookings WHERE id = ? AND user_id = ?', [
          req.params.id,
          req.userId
        ]);
        if (!peek) throw new AppError('预约不存在', 404);
        if (peek.session_id) {
          await one(conn, 'SELECT * FROM sessions WHERE id = ? FOR UPDATE', [peek.session_id]);
        }
        const b = await one(conn, 'SELECT * FROM bookings WHERE id = ? AND user_id = ? FOR UPDATE', [
          req.params.id,
          req.userId
        ]);
        if (!b) throw new AppError('预约不存在', 404);
        if (b.status !== 'upcoming') throw new AppError('当前状态不可取消', 409);
        const startAt = shanghaiMillis(b.act_date, b.start_hm);
        const hours = Number(b.cancel_hours) || 6;
        if (startAt - Date.now() < hours * 3600000) {
          throw new AppError('已过取消时限', 409);
        }
        await conn.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [b.id]);
        if (b.session_id) {
          await conn.execute('UPDATE sessions SET booked = GREATEST(booked - 1, 0) WHERE id = ?', [b.session_id]);
        }
        if (b.kind === 'private') {
          const pack = await one(
            conn,
            'SELECT * FROM owned_packages WHERE user_id = ? ORDER BY id LIMIT 1 FOR UPDATE',
            [req.userId]
          );
          if (pack) {
            await conn.execute('UPDATE owned_packages SET remain = remain + 1 WHERE id = ?', [pack.id]);
          }
        }
        if (b.order_id) {
          const o = await one(conn, 'SELECT * FROM orders WHERE id = ? FOR UPDATE', [b.order_id]);
          if (o && Number(o.amount) > 0) {
            await conn.execute(
              "UPDATE orders SET status = 'refunded', refund_amount = amount WHERE id = ?",
              [o.id]
            );
          }
        }
        return { id: b.id, status: 'cancelled' };
      });
      res.json({ ok: true, data: out });
    })
  );

  router.post(
    '/activities/:id/join-free',
    asyncHandler(async (req, res) => {
      const out = await withTxn(async function (conn) {
        await expirePending(conn);
        const a = await one(conn, 'SELECT * FROM activities WHERE id = ? FOR UPDATE', [req.params.id]);
        if (!a) throw new AppError('活动不存在', 404);
        if (a.status === 'ended') throw new AppError('已结束', 409);
        if (a.paid) throw new AppError('该活动需要支付报名', 400);
        const dup = await one(
          conn,
          "SELECT id FROM bookings WHERE user_id = ? AND activity_id = ? AND status = 'upcoming'",
          [req.userId, a.id]
        );
        if (dup) throw new AppError('已经报名过这个活动', 409);
        if (Number(a.booked) >= Number(a.capacity)) throw new AppError('已满', 409);
        await occupyBooked(conn, 'activities', a.id, '已满');
        const bookingId = uid('BK');
        await conn.execute(
          `INSERT INTO bookings (
             id, user_id, status, created_at, duration_min, kind, title, act_date, store_id, activity_id, cover
           ) VALUES (?, ?, 'upcoming', ?, 60, 'activity', ?, ?, ?, ?, ?)`,
          [bookingId, req.userId, Date.now(), a.name, a.act_date, a.store_id, a.id, a.cover]
        );
        return { id: bookingId };
      });
      res.json({ ok: true, data: out });
    })
  );

  router.post(
    '/enterprise',
    asyncHandler(async (req, res) => {
      const body = req.body || {};
      const company = String(body.company || '').trim();
      const name = String(body.name || '').trim();
      const phone = String(body.phone || '').trim();
      const need = String(body.need || '').trim();
      if (!company) throw new AppError('请填写公司名', 400);
      if (!name) throw new AppError('请填写联系人', 400);
      if (!/^1\d{10}$/.test(phone)) throw new AppError('请填写 11 位手机号', 400);
      if (!need) throw new AppError('请填写需求', 400);
      const id = uid('ENT');
      await pool.execute(
        `INSERT INTO enterprise_leads (id, user_id, company, contact_name, phone, need_text, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, req.userId, company, name, phone, need, Date.now()]
      );
      res.status(201).json({ ok: true, data: { id: id } });
    })
  );

  return router;
}

module.exports = { createRouter };
