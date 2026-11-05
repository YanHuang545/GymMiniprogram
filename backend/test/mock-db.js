'use strict';

function ok(changed) {
  return { affectedRows: changed, changedRows: changed, insertId: 0 };
}

function norm(sql) {
  return String(sql || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function clone(row) {
  return row ? Object.assign({}, row) : row;
}

function splitArgs(s) {
  const out = [];
  let cur = '';
  let quote = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "'" && s[i - 1] !== '\\') quote = !quote;
    if (ch === ',' && !quote) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseValue(raw, params, state) {
  if (raw === '?') {
    const v = params[state.i];
    state.i += 1;
    return v;
  }
  if (raw === 'NULL' || raw === 'null') return null;
  if (/^'.*'$/.test(raw)) return raw.slice(1, -1);
  if (raw === '0' || !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

function parseInsert(sql, params) {
  const n = norm(sql);
  const m = n.match(/^INSERT INTO (\w+) \(([^)]+)\) VALUES \((.+)\)$/i);
  if (!m) return null;
  const table = m[1];
  const cols = m[2].split(',').map(function (c) {
    return c.trim();
  });
  const vals = splitArgs(m[3]);
  const row = {};
  const state = { i: 0 };
  cols.forEach(function (col, idx) {
    row[col] = parseValue(vals[idx], params, state);
  });
  return { table: table, row: row };
}

function tableList(store, name) {
  if (!store[name]) store[name] = [];
  return store[name];
}

function findById(store, table, id) {
  return tableList(store, table).find(function (r) {
    return r.id === id;
  });
}

function defaultStore() {
  return {
    users: [
      {
        id: 'U001',
        openid: null,
        nickname: 'demo',
        avatar: '',
        phone: '13800138000',
        authorized: 1,
        notify_enabled: 0,
        current_city: '北京',
        current_store_id: 'ST001',
        seen_auth: 1
      },
      {
        id: 'U002',
        openid: 'oid-u002',
        nickname: 'other',
        avatar: '',
        phone: '',
        authorized: 1,
        notify_enabled: 0,
        current_city: '北京',
        current_store_id: 'ST001',
        seen_auth: 1
      }
    ],
    stores: [
      {
        id: 'ST001',
        city: '北京',
        name: '朝阳店',
        dist: '',
        hours: '',
        phone: '',
        address: '',
        cover: '',
        gallery: '[]',
        tags: '[]'
      }
    ],
    coaches: [
      {
        id: 'C001',
        name: '林教练',
        avatar: '',
        title: '',
        skills: '[]',
        years: 3,
        intro: '',
        store_id: 'ST001'
      }
    ],
    banners: [],
    sessions: [
      {
        id: 'S001',
        course_id: 'CR001',
        name: '燃脂操',
        cover: '',
        tags: '[]',
        duration_min: 60,
        intensity: '中',
        crowd: '',
        store_id: 'ST001',
        coach_id: 'C001',
        date_offset: 7,
        start_hm: '18:00',
        end_hm: '19:00',
        price: 99,
        origin_price: 129,
        capacity: 5,
        booked: 4,
        seed_booked: 2,
        room: 'A',
        intro: ''
      }
    ],
    packages: [],
    camps: [
      {
        id: 'M001',
        name: '训练营',
        tags: '[]',
        cover: '',
        start_offset: 10,
        weeks: 4,
        price: 199,
        origin_price: 299,
        capacity: 10,
        booked: 3,
        seed_booked: 1,
        enroll_offset: 0,
        coach_id: 'C001',
        store_id: 'ST001',
        schedule: '[]',
        intro: ''
      }
    ],
    venues: [],
    activities: [
      {
        id: 'A001',
        name: '免费体验',
        cover: '',
        act_date: '2099-01-01',
        act_time: '10:00',
        store_id: 'ST001',
        status: 'open',
        paid: 0,
        price: 0,
        intro: '',
        booked: 1,
        seed_booked: 0,
        capacity: 20
      }
    ],
    coupons: [
      {
        id: 'CP001',
        user_id: 'U001',
        name: '新人券',
        amount: 10,
        min_amount: 0,
        status: 'unused',
        expire_offset: 30
      }
    ],
    owned_packages: [
      {
        id: 'OP001',
        user_id: 'U001',
        package_id: 'P002',
        name: '周期课包 10 节',
        total: 10,
        remain: 3,
        expire_offset: 70,
        expire_date: '2099-01-01'
      }
    ],
    orders: [],
    bookings: [],
    payments: [],
    enterprise_leads: []
  };
}

function createPool(store, options) {
  const opts = options || {};
  let deadlockLeft = opts.deadlockOnInventory || 0;

  async function execute(sql, params) {
    params = params || [];
    const n = norm(sql);
    const q = n.replace(/\s+FOR UPDATE$/i, '');
    if (opts.yieldOnSelect && /^SELECT /i.test(q)) {
      await new Promise(function (resolve) {
        setImmediate(resolve);
      });
    }

    const inserted = parseInsert(q, params);
    if (inserted) {
      tableList(store, inserted.table).push(inserted.row);
      return [ok(1)];
    }

    if (/^DELETE FROM (\w+) WHERE user_id = \?$/i.test(q)) {
      const table = q.match(/^DELETE FROM (\w+)/i)[1];
      const list = tableList(store, table);
      const keep = list.filter(function (r) {
        return r.user_id !== params[0];
      });
      const changed = list.length - keep.length;
      store[table] = keep;
      return [ok(changed)];
    }

    if (/UPDATE sessions SET booked = seed_booked/i.test(q)) {
      store.sessions.forEach(function (s) {
        s.booked = s.seed_booked;
      });
      return [ok(store.sessions.length)];
    }
    if (/UPDATE camps SET booked = seed_booked/i.test(q)) {
      store.camps.forEach(function (s) {
        s.booked = s.seed_booked;
      });
      return [ok(store.camps.length)];
    }
    if (/UPDATE activities SET booked = seed_booked/i.test(q)) {
      store.activities.forEach(function (s) {
        s.booked = s.seed_booked;
      });
      return [ok(store.activities.length)];
    }

    if (/UPDATE (\w+) SET booked = booked \+ 1 WHERE id = \? AND booked < capacity/i.test(q)) {
      const table = q.match(/UPDATE (\w+)/i)[1];
      if (deadlockLeft > 0) {
        deadlockLeft -= 1;
        const err = new Error('Deadlock found when trying to get lock');
        err.code = 'ER_LOCK_DEADLOCK';
        throw err;
      }
      const row = findById(store, table, params[0]);
      if (row && Number(row.booked) < Number(row.capacity)) {
        row.booked = Number(row.booked) + 1;
        return [ok(1)];
      }
      return [ok(0)];
    }

    if (/UPDATE (\w+) SET booked = booked \+ 1 WHERE id = \?/i.test(q)) {
      const table = q.match(/UPDATE (\w+)/i)[1];
      if (deadlockLeft > 0) {
        deadlockLeft -= 1;
        const err = new Error('Deadlock found when trying to get lock');
        err.code = 'ER_LOCK_DEADLOCK';
        throw err;
      }
      const row = findById(store, table, params[0]);
      if (row) {
        row.booked = Number(row.booked) + 1;
        return [ok(1)];
      }
      return [ok(0)];
    }

    if (/UPDATE (\w+) SET booked = GREATEST\(booked - 1, 0\) WHERE id = \?/i.test(q)) {
      const table = q.match(/UPDATE (\w+)/i)[1];
      const row = findById(store, table, params[0]);
      if (row) {
        row.booked = Math.max(Number(row.booked) - 1, 0);
        return [ok(1)];
      }
      return [ok(0)];
    }

    if (/UPDATE orders SET status = 'closed' WHERE id = \? AND status = 'pending_payment'/i.test(q)) {
      const o = findById(store, 'orders', params[0]);
      if (o && o.status === 'pending_payment') {
        o.status = 'closed';
        return [ok(1)];
      }
      return [ok(0)];
    }
    if (/UPDATE orders SET status = 'closed' WHERE id = \?/i.test(q)) {
      const o = findById(store, 'orders', params[0]);
      if (o) {
        o.status = 'closed';
        return [ok(1)];
      }
      return [ok(0)];
    }
    if (/UPDATE orders SET status = 'paid' WHERE id = \?/i.test(q)) {
      const o = findById(store, 'orders', params[0]);
      if (o) {
        o.status = 'paid';
        return [ok(1)];
      }
      return [ok(0)];
    }
    if (/UPDATE orders SET status = 'refunded', refund_amount = amount WHERE id = \?/i.test(q)) {
      const o = findById(store, 'orders', params[0]);
      if (o) {
        o.status = 'refunded';
        o.refund_amount = o.amount;
        return [ok(1)];
      }
      return [ok(0)];
    }
    if (/UPDATE orders SET status = 'refunding', refund_amount = amount WHERE id = \?/i.test(q)) {
      const o = findById(store, 'orders', params[0]);
      if (o) {
        o.status = 'refunding';
        o.refund_amount = o.amount;
        return [ok(1)];
      }
      return [ok(0)];
    }
    if (/UPDATE orders SET status = 'refunded' WHERE id = \? AND status = 'refunding'/i.test(q)) {
      const o = findById(store, 'orders', params[0]);
      if (o && o.status === 'refunding') {
        o.status = 'refunded';
        return [ok(1)];
      }
      return [ok(0)];
    }

    if (/UPDATE coupons SET status = 'used' WHERE id = \? AND user_id = \?/i.test(q)) {
      const c = findById(store, 'coupons', params[0]);
      if (c && c.user_id === params[1]) {
        c.status = 'used';
        return [ok(1)];
      }
      return [ok(0)];
    }
    if (/UPDATE coupons SET status = 'unused' WHERE id = \? AND status = 'used'/i.test(q)) {
      const c = findById(store, 'coupons', params[0]);
      if (c && c.status === 'used') {
        c.status = 'unused';
        return [ok(1)];
      }
      return [ok(0)];
    }
    if (/UPDATE coupons SET status = 'unused' WHERE user_id = \?/i.test(q)) {
      let nchg = 0;
      store.coupons.forEach(function (c) {
        if (c.user_id === params[0]) {
          c.status = 'unused';
          nchg += 1;
        }
      });
      return [ok(nchg)];
    }

    if (/UPDATE owned_packages SET remain = remain - 1 WHERE id = \?/i.test(q)) {
      const p = findById(store, 'owned_packages', params[0]);
      if (p) {
        p.remain = Number(p.remain) - 1;
        return [ok(1)];
      }
      return [ok(0)];
    }
    if (/UPDATE owned_packages SET remain = remain \+ 1 WHERE id = \?/i.test(q)) {
      const p = findById(store, 'owned_packages', params[0]);
      if (p) {
        p.remain = Number(p.remain) + 1;
        return [ok(1)];
      }
      return [ok(0)];
    }

    if (/UPDATE bookings SET status = 'cancelled' WHERE id = \?/i.test(q)) {
      const b = findById(store, 'bookings', params[0]);
      if (b) {
        b.status = 'cancelled';
        return [ok(1)];
      }
      return [ok(0)];
    }
    if (/UPDATE bookings SET act_date = \?, start_hm = \?, end_hm = \? WHERE id = \?/i.test(q)) {
      const b = findById(store, 'bookings', params[3]);
      if (b) {
        b.act_date = params[0];
        b.start_hm = params[1];
        b.end_hm = params[2];
        return [ok(1)];
      }
      return [ok(0)];
    }

    if (/UPDATE users SET authorized = 0 WHERE id = \?/i.test(q)) {
      const u = findById(store, 'users', params[0]);
      if (u) {
        u.authorized = 0;
        return [ok(1)];
      }
      return [ok(0)];
    }
    if (/UPDATE users SET nickname = ''/i.test(q)) {
      const u = findById(store, 'users', params[0]);
      if (u) {
        u.nickname = '';
        u.phone = '';
        u.authorized = 0;
        u.notify_enabled = 0;
        u.current_city = '北京';
        u.current_store_id = 'ST001';
        u.seen_auth = 0;
        return [ok(1)];
      }
      return [ok(0)];
    }
    if (/UPDATE users SET last_login_at = \? WHERE id = \?/i.test(q)) {
      const u = findById(store, 'users', params[1]);
      if (u) {
        u.last_login_at = params[0];
        return [ok(1)];
      }
      return [ok(0)];
    }

    if (/SELECT id, session_id/.test(q) && /FROM orders WHERE status = 'pending_payment' AND created_at < \?/i.test(q)) {
      const cutoff = params[0];
      return [
        store.orders
          .filter(function (o) {
            return o.status === 'pending_payment' && Number(o.created_at) < cutoff;
          })
          .map(clone)
      ];
    }

    if (/FROM orders WHERE status = 'pending_payment' AND created_at < \?/i.test(q)) {
      const cutoff = params[0];
      return [
        store.orders
          .filter(function (o) {
            return o.status === 'pending_payment' && Number(o.created_at) < cutoff;
          })
          .map(clone)
      ];
    }

    if (/FROM coupons c/i.test(q) || (/FROM coupons/.test(q) && /user_id = \?/.test(q) && !/WHERE id = \?/.test(q))) {
      return [
        store.coupons
          .filter(function (c) {
            return c.user_id === params[0];
          })
          .map(clone)
      ];
    }
    if (/FROM owned_packages p/i.test(q) && /INNER JOIN users/i.test(q)) {
      return [
        store.owned_packages
          .filter(function (c) {
            return c.user_id === params[0];
          })
          .map(clone)
      ];
    }
    if (/FROM bookings b/i.test(q) && /INNER JOIN users/i.test(q)) {
      return [
        store.bookings
          .filter(function (c) {
            return c.user_id === params[0];
          })
          .map(clone)
      ];
    }
    if (/FROM orders o/i.test(q) && /INNER JOIN users/i.test(q)) {
      return [
        store.orders
          .filter(function (c) {
            return c.user_id === params[0];
          })
          .map(clone)
      ];
    }
    if (/FROM payments p/i.test(q) && /INNER JOIN users/i.test(q)) {
      return [
        store.payments
          .filter(function (c) {
            return c.user_id === params[0];
          })
          .map(clone)
      ];
    }
    if (/FROM enterprise_leads l/i.test(q) && /INNER JOIN users/i.test(q)) {
      return [
        store.enterprise_leads
          .filter(function (c) {
            return c.user_id === params[0];
          })
          .map(clone)
      ];
    }

    if (/SELECT \* FROM owned_packages WHERE user_id = \? AND remain > 0/i.test(q)) {
      const todayStr = params.length > 1 ? params[1] : null;
      let rows = store.owned_packages.filter(function (p) {
        return p.user_id === params[0] && Number(p.remain) > 0;
      });
      if (/expire_date/i.test(q) && todayStr) {
        rows = rows.filter(function (p) {
          return !p.expire_date || String(p.expire_date) >= String(todayStr);
        });
      }
      rows.sort(function (a, b) {
        return String(a.id).localeCompare(String(b.id));
      });
      if (/LIMIT 1/i.test(q)) rows = rows.slice(0, 1);
      return [rows.map(clone)];
    }

    if (/SELECT \* FROM owned_packages WHERE user_id = \? ORDER BY id LIMIT 1/i.test(q)) {
      const rows = store.owned_packages
        .filter(function (p) {
          return p.user_id === params[0];
        })
        .sort(function (a, b) {
          return String(a.id).localeCompare(String(b.id));
        })
        .slice(0, 1);
      return [rows.map(clone)];
    }

    if (/SELECT id FROM bookings WHERE user_id = \? AND session_id = \? AND status = 'upcoming'/i.test(q)) {
      return [
        store.bookings
          .filter(function (b) {
            return b.user_id === params[0] && b.session_id === params[1] && b.status === 'upcoming';
          })
          .map(function (b) {
            return { id: b.id };
          })
      ];
    }
    if (/SELECT id FROM bookings WHERE user_id = \? AND activity_id = \? AND status = 'upcoming'/i.test(q)) {
      return [
        store.bookings
          .filter(function (b) {
            return b.user_id === params[0] && b.activity_id === params[1] && b.status === 'upcoming';
          })
          .map(function (b) {
            return { id: b.id };
          })
      ];
    }
    if (
      /SELECT id FROM bookings WHERE coach_id = \? AND act_date = \? AND start_hm = \? AND status = 'upcoming'/i.test(q)
    ) {
      return [
        store.bookings
          .filter(function (b) {
            return (
              b.coach_id === params[0] &&
              b.act_date === params[1] &&
              b.start_hm === params[2] &&
              b.status === 'upcoming'
            );
          })
          .map(function (b) {
            return { id: b.id };
          })
      ];
    }

    if (/SELECT \* FROM orders WHERE user_id = \? AND status = 'pending_payment'/i.test(q)) {
      let rows = store.orders.filter(function (o) {
        return o.user_id === params[0] && o.status === 'pending_payment';
      });
      if (/session_id = \?/.test(q)) {
        rows = rows.filter(function (o) {
          return o.session_id === params[1];
        });
      } else if (/camp_id = \?/.test(q)) {
        rows = rows.filter(function (o) {
          return o.camp_id === params[1];
        });
      } else if (/activity_id = \?/.test(q)) {
        rows = rows.filter(function (o) {
          return o.activity_id === params[1];
        });
      }
      if (/coupon_id = \?/.test(q)) {
        rows = rows.filter(function (o) {
          return o.coupon_id === params[1];
        });
      }
      return [rows.map(clone)];
    }

    if (/SELECT \* FROM orders WHERE coupon_id = \? AND status = 'pending_payment'/i.test(q)) {
      return [
        store.orders
          .filter(function (o) {
            return o.coupon_id === params[0] && o.status === 'pending_payment';
          })
          .map(clone)
      ];
    }

    if (/SELECT id, status, act_date, start_hm, end_hm FROM bookings WHERE user_id = \? AND status = 'upcoming'/i.test(q)) {
      return [
        store.bookings
          .filter(function (b) {
            return b.user_id === params[0] && b.status === 'upcoming';
          })
          .map(function (b) {
            return {
              id: b.id,
              status: b.status,
              act_date: b.act_date,
              start_hm: b.start_hm,
              end_hm: b.end_hm
            };
          })
      ];
    }

    if (/SELECT id FROM bookings WHERE user_id = \? AND status = 'cancelled'/i.test(q)) {
      return [
        store.bookings
          .filter(function (b) {
            if (b.user_id !== params[0] || b.status !== 'cancelled') return false;
            if (/session_id = \?/.test(q)) return b.session_id === params[1];
            if (/venue_id = \?/.test(q)) return b.venue_id === params[1];
            if (/camp_id = \?/.test(q)) return b.camp_id === params[1];
            if (/activity_id = \?/.test(q)) return b.activity_id === params[1];
            if (/coach_id = \?/.test(q)) {
              return b.coach_id === params[1] && b.act_date === params[2] && b.start_hm === params[3];
            }
            return true;
          })
          .map(function (b) {
            return { id: b.id };
          })
      ];
    }

    if (/SELECT \* FROM coupons WHERE id = \? AND user_id = \?/i.test(q)) {
      const c = store.coupons.find(function (row) {
        return row.id === params[0] && row.user_id === params[1];
      });
      return [c ? [clone(c)] : []];
    }

    if (/SELECT id FROM users WHERE openid = \?/i.test(q)) {
      const u = store.users.find(function (row) {
        return row.openid === params[0];
      });
      return [u ? [{ id: u.id }] : []];
    }
    if (/SELECT id FROM users WHERE id = \?/i.test(q)) {
      const u = findById(store, 'users', params[0]);
      return [u ? [{ id: u.id }] : []];
    }

    if (/SELECT \* FROM (\w+) WHERE id = \? AND user_id = \?/i.test(q)) {
      const table = q.match(/FROM (\w+)/i)[1];
      const row = tableList(store, table).find(function (r) {
        return r.id === params[0] && r.user_id === params[1];
      });
      return [row ? [clone(row)] : []];
    }

    if (/SELECT \* FROM (\w+) WHERE id = \?/i.test(q)) {
      const table = q.match(/FROM (\w+)/i)[1];
      const row = findById(store, table, params[0]);
      return [row ? [clone(row)] : []];
    }

    if (/SELECT id, city FROM stores WHERE id = \?/i.test(q)) {
      const row = findById(store, 'stores', params[0]);
      return [row ? [{ id: row.id, city: row.city }] : []];
    }

    if (/SELECT \* FROM (\w+) ORDER BY/i.test(q)) {
      const table = q.match(/FROM (\w+)/i)[1];
      return [tableList(store, table).map(clone)];
    }

    throw new Error('unexpected sql: ' + q);
  }

  return {
    store: store,
    execute: execute,
    query: execute,
    async getConnection() {
      return {
        execute: execute,
        beginTransaction: async function () {},
        commit: async function () {},
        rollback: async function () {},
        release: function () {}
      };
    }
  };
}

module.exports = {
  defaultStore: defaultStore,
  createPool: createPool
};
