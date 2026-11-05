const { offsetDate, asArr, bool } = require('./ids');

const SCHEMA = 1;
const OSS_PHOTO =
  'https://mashangfei1112.oss-accelerate.aliyuncs.com/gym-demo/photos/';
const PUBLIC_PHOTO =
  (process.env.PUBLIC_BASE_URL || 'https://gymbackend.chuckrock.dpdns.org').replace(
    /\/$/,
    ''
  ) + '/oss-photos/';

function rewriteMedia(value) {
  if (typeof value === 'string') {
    if (value.indexOf(OSS_PHOTO) === 0) {
      return PUBLIC_PHOTO + value.slice(OSS_PHOTO.length);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(rewriteMedia);
  if (value && typeof value === 'object') {
    var out = {};
    Object.keys(value).forEach(function (key) {
      out[key] = rewriteMedia(value[key]);
    });
    return out;
  }
  return value;
}

function mapUser(r) {
  return {
    id: r.id,
    nickname: r.nickname || '',
    avatar: r.avatar || '',
    phone: r.phone || '',
    authorized: bool(r.authorized),
    notifyEnabled: bool(r.notify_enabled),
    currentCity: r.current_city,
    currentStoreId: r.current_store_id,
    seenAuth: bool(r.seen_auth)
  };
}

function mapStore(r) {
  return {
    id: r.id,
    city: r.city,
    name: r.name,
    dist: r.dist,
    hours: r.hours,
    phone: r.phone,
    address: r.address,
    cover: r.cover,
    gallery: asArr(r.gallery),
    tags: asArr(r.tags)
  };
}

function mapCoach(r) {
  return {
    id: r.id,
    name: r.name,
    avatar: r.avatar,
    title: r.title,
    skills: asArr(r.skills),
    years: Number(r.years) || 0,
    intro: r.intro || '',
    storeId: r.store_id
  };
}

function mapBanner(r) {
  return {
    id: r.id,
    image: r.image,
    title: r.title,
    sub: r.sub,
    link: r.link,
    fb: r.fb
  };
}

function mapSession(r) {
  return {
    id: r.id,
    courseId: r.course_id,
    name: r.name,
    cover: r.cover,
    tags: asArr(r.tags),
    durationMin: Number(r.duration_min) || 60,
    intensity: r.intensity,
    crowd: r.crowd,
    storeId: r.store_id,
    coachId: r.coach_id,
    date: offsetDate(r.date_offset),
    start: r.start_hm,
    end: r.end_hm,
    price: Number(r.price) || 0,
    originPrice: Number(r.origin_price) || 0,
    capacity: Number(r.capacity) || 0,
    booked: Number(r.booked) || 0,
    room: r.room,
    intro: r.intro || ''
  };
}

function mapPackage(r) {
  return {
    id: r.id,
    name: r.name,
    sessions: Number(r.sessions) || 0,
    price: Number(r.price) || 0,
    originPrice: Number(r.origin_price) || 0,
    validDays: Number(r.valid_days) || 0,
    desc: r.description || '',
    cover: r.cover
  };
}

function mapCamp(r) {
  return {
    id: r.id,
    name: r.name,
    tags: asArr(r.tags),
    cover: r.cover,
    startDate: offsetDate(r.start_offset),
    weeks: Number(r.weeks) || 0,
    price: Number(r.price) || 0,
    originPrice: Number(r.origin_price) || 0,
    capacity: Number(r.capacity) || 0,
    booked: Number(r.booked) || 0,
    enrollStart: offsetDate(r.enroll_offset),
    coachId: r.coach_id,
    storeId: r.store_id,
    schedule: asArr(r.schedule),
    intro: r.intro || ''
  };
}

function mapVenue(r) {
  return {
    id: r.id,
    name: r.name,
    tags: asArr(r.tags),
    cover: r.cover,
    dist: r.dist,
    price: Number(r.price) || 0,
    originPrice: Number(r.origin_price) || 0,
    hours: r.hours,
    intro: r.intro || '',
    cancelHours: Number(r.cancel_hours) || 6,
    address: r.address
  };
}

function mapActivity(r) {
  return {
    id: r.id,
    name: r.name,
    cover: r.cover,
    date: r.act_date,
    time: r.act_time,
    storeId: r.store_id,
    status: r.status,
    paid: bool(r.paid),
    price: Number(r.price) || 0,
    intro: r.intro || '',
    booked: Number(r.booked) || 0,
    capacity: Number(r.capacity) || 0
  };
}

function mapCoupon(r) {
  return {
    id: r.id,
    name: r.name,
    amount: Number(r.amount) || 0,
    min: Number(r.min_amount) || 0,
    status: r.status,
    expire: r.expire_date || offsetDate(r.expire_offset)
  };
}

function mapOwned(r) {
  return {
    id: r.id,
    packageId: r.package_id,
    name: r.name,
    total: Number(r.total) || 0,
    remain: Number(r.remain) || 0,
    expire: r.expire_date || offsetDate(r.expire_offset)
  };
}

function mapOrder(r) {
  return {
    id: r.id,
    userId: r.user_id,
    status: r.status,
    createdAt: Number(r.created_at) || 0,
    amount: Number(r.amount) || 0,
    refundAmount: Number(r.refund_amount) || 0,
    title: r.title,
    when: r.when_text,
    place: r.place,
    kind: r.kind,
    sessionId: r.session_id || undefined,
    packageId: r.package_id || undefined,
    campId: r.camp_id || undefined,
    venueId: r.venue_id || undefined,
    activityId: r.activity_id || undefined,
    coachId: r.coach_id || undefined,
    date: r.act_date || undefined,
    start: r.start_hm || undefined,
    end: r.end_hm || undefined,
    storeId: r.store_id || undefined,
    cover: r.cover || undefined,
    durationMin: Number(r.duration_min) || 60,
    couponId: r.coupon_id || undefined,
    cancelHours: Number(r.cancel_hours) || 6
  };
}

function mapBooking(r) {
  return {
    id: r.id,
    status: r.status,
    createdAt: Number(r.created_at) || 0,
    durationMin: Number(r.duration_min) || 60,
    orderId: r.order_id || undefined,
    kind: r.kind,
    title: r.title,
    date: r.act_date || undefined,
    start: r.start_hm || undefined,
    end: r.end_hm || undefined,
    storeId: r.store_id || undefined,
    sessionId: r.session_id || undefined,
    venueId: r.venue_id || undefined,
    campId: r.camp_id || undefined,
    activityId: r.activity_id || undefined,
    coachId: r.coach_id || undefined,
    cover: r.cover || undefined,
    cancelHours: Number(r.cancel_hours) || 6
  };
}

function mapPayment(r) {
  return {
    id: r.id,
    orderId: r.order_id,
    amount: Number(r.amount) || 0,
    at: Number(r.paid_at) || 0,
    channel: r.channel
  };
}

function mapLead(r) {
  return {
    id: r.id,
    company: r.company,
    name: r.contact_name,
    phone: r.phone,
    need: r.need_text,
    at: Number(r.created_at) || 0
  };
}

function didChange(result) {
  if (!result) return false;
  const n =
    result.changedRows != null ? Number(result.changedRows) : Number(result.affectedRows);
  return n > 0;
}

async function expirePending(exec) {
  const cutoff = Date.now() - 15 * 60 * 1000;
  const [orders] = await exec.execute(
    `SELECT id, session_id, camp_id, activity_id, coupon_id
     FROM orders WHERE status = 'pending_payment' AND created_at < ? FOR UPDATE`,
    [cutoff]
  );
  for (const o of orders) {
    const [result] = await exec.execute(
      "UPDATE orders SET status = 'closed' WHERE id = ? AND status = 'pending_payment'",
      [o.id]
    );
    if (!didChange(result)) continue;
    if (o.session_id) {
      await exec.execute(
        'UPDATE sessions SET booked = GREATEST(booked - 1, 0) WHERE id = ?',
        [o.session_id]
      );
    }
    if (o.camp_id) {
      await exec.execute(
        'UPDATE camps SET booked = GREATEST(booked - 1, 0) WHERE id = ?',
        [o.camp_id]
      );
    }
    if (o.activity_id) {
      await exec.execute(
        'UPDATE activities SET booked = GREATEST(booked - 1, 0) WHERE id = ?',
        [o.activity_id]
      );
    }
    if (o.coupon_id) {
      await exec.execute("UPDATE coupons SET status = 'unused' WHERE id = ? AND status = 'used'", [
        o.coupon_id
      ]);
    }
  }
}

async function hydrate(pool, userId) {
  const [
    [users],
    [stores],
    [coaches],
    [banners],
    [sessions],
    [packages],
    [camps],
    [venues],
    [activities],
    [coupons],
    [owned],
    [bookings],
    [orders],
    [payments],
    [leads]
  ] = await Promise.all([
    pool.execute('SELECT * FROM users WHERE id = ?', [userId]),
    pool.execute('SELECT * FROM stores ORDER BY id'),
    pool.execute('SELECT * FROM coaches ORDER BY id'),
    pool.execute('SELECT * FROM banners ORDER BY sort_order, id'),
    pool.execute('SELECT * FROM sessions ORDER BY date_offset, start_hm, id'),
    pool.execute('SELECT * FROM packages ORDER BY id'),
    pool.execute('SELECT * FROM camps ORDER BY start_offset, id'),
    pool.execute('SELECT * FROM venues ORDER BY id'),
    pool.execute('SELECT * FROM activities ORDER BY act_date DESC, id'),
    pool.execute(
      `SELECT c.* FROM coupons c
       INNER JOIN users u ON u.id = c.user_id AND u.authorized = 1
       WHERE c.user_id = ? ORDER BY c.id`,
      [userId]
    ),
    pool.execute(
      `SELECT p.* FROM owned_packages p
       INNER JOIN users u ON u.id = p.user_id AND u.authorized = 1
       WHERE p.user_id = ? ORDER BY p.id`,
      [userId]
    ),
    pool.execute(
      `SELECT b.* FROM bookings b
       INNER JOIN users u ON u.id = b.user_id AND u.authorized = 1
       WHERE b.user_id = ? ORDER BY b.created_at DESC`,
      [userId]
    ),
    pool.execute(
      `SELECT o.* FROM orders o
       INNER JOIN users u ON u.id = o.user_id AND u.authorized = 1
       WHERE o.user_id = ? ORDER BY o.created_at DESC`,
      [userId]
    ),
    pool.execute(
      `SELECT p.* FROM payments p
       INNER JOIN users u ON u.id = p.user_id AND u.authorized = 1
       WHERE p.user_id = ? ORDER BY p.paid_at DESC`,
      [userId]
    ),
    pool.execute(
      `SELECT l.* FROM enterprise_leads l
       INNER JOIN users u ON u.id = l.user_id AND u.authorized = 1
       WHERE l.user_id = ? ORDER BY l.created_at DESC`,
      [userId]
    )
  ]);

  const user = users[0]
    ? mapUser(users[0])
    : {
        id: userId,
        nickname: '',
        avatar: '',
        phone: '',
        authorized: false,
        notifyEnabled: false,
        currentCity: '北京',
        currentStoreId: 'ST001',
        seenAuth: false
      };

  return rewriteMedia({
    version: SCHEMA,
    user: user,
    stores: stores.map(mapStore),
    coaches: coaches.map(mapCoach),
    banners: banners.map(mapBanner),
    sessions: sessions.map(mapSession),
    packages: packages.map(mapPackage),
    camps: camps.map(mapCamp),
    venues: venues.map(mapVenue),
    activities: activities.map(mapActivity),
    coupons: coupons.map(mapCoupon),
    ownedPackages: owned.map(mapOwned),
    bookings: bookings.map(mapBooking),
    orders: orders.map(mapOrder),
    payments: payments.map(mapPayment),
    enterpriseLeads: leads.map(mapLead),
    favorites: []
  });
}

module.exports = {
  SCHEMA,
  hydrate,
  expirePending,
  didChange,
  mapUser,
  mapStore,
  mapCoach,
  mapBanner,
  mapSession,
  mapPackage,
  mapCamp,
  mapVenue,
  mapActivity,
  mapCoupon,
  mapOwned,
  mapOrder,
  mapBooking
};
