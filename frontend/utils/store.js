var cloudConfig = require('./cloud-config.js');

var SCHEMA = 1;
var STORE_KEY = 'shoe_wash_demo_store';
var OSS_HOST = 'gymbackend.chuckrock.dpdns.org';

function photoBase() {
  if (cloudConfig.photoPrefix) {
    return cloudConfig.photoPrefix.replace(/\/?$/, '/');
  }
  try {
    if (wx.getSystemInfoSync().platform === 'devtools') {
      return 'http://' + OSS_HOST + '/oss-photos/';
    }
  } catch (e) {}
  return 'https://' + OSS_HOST + '/oss-photos/';
}

var LABELS = {
  pending_payment: '待支付',
  paid: '已支付',
  refunding: '退款中',
  refunded: '已退款',
  closed: '已关闭',
  upcoming: '待上课',
  completed: '已完成',
  cancelled: '已取消',
  group: '团课',
  private: '私教',
  camp: '训练营',
  venue: '甄选',
  activity: '活动',
  package: '课包',
  open: '报名中',
  ended: '已结束',
  full: '已满',
  unused: '未使用',
  used: '已使用',
  expired: '已过期'
};

function ossUrl(name) {
  return photoBase() + name + '.jpg';
}

function labelOf(code, fallback) {
  return LABELS[code] || fallback || '未知状态';
}

function findById(list, id) {
  return (list || []).find(function (x) {
    return x.id === id;
  }) || null;
}

function emptyData() {
  return {
    version: SCHEMA,
    user: {
      id: 'U001',
      nickname: '',
      avatar: ossUrl('avatar-user'),
      phone: '',
      authorized: false,
      notifyEnabled: false,
      currentCity: '北京',
      currentStoreId: 'ST001',
      seenAuth: false
    },
    stores: [],
    coaches: [],
    banners: [],
    sessions: [],
    packages: [],
    camps: [],
    venues: [],
    activities: [],
    coupons: [],
    ownedPackages: [],
    bookings: [],
    orders: [],
    payments: [],
    enterpriseLeads: [],
    favorites: []
  };
}

function loadCache() {
  try {
    var raw = wx.getStorageSync(STORE_KEY);
    if (!raw) return null;
    var parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    var data = parsed && parsed.data ? parsed.data : parsed;
    if (!data || !data.user) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function saveCache(data) {
  try {
    wx.setStorageSync(STORE_KEY, { version: SCHEMA, data: data });
    return true;
  } catch (e) {
    return false;
  }
}

function currentStore(data) {
  var id = data.user.currentStoreId;
  return findById(data.stores, id) || data.stores[0];
}

function remainingPkg(data) {
  return (data.ownedPackages || []).reduce(function (s, p) {
    return s + utilNum(p.remain);
  }, 0);
}

function utilNum(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

function unusedCoupons(data) {
  return (data.coupons || []).filter(function (c) {
    return c.status === 'unused';
  });
}

function trainStats(data) {
  var done = (data.bookings || []).filter(function (b) {
    return b.status === 'completed';
  });
  var days = {};
  var mins = 0;
  done.forEach(function (b) {
    days[b.date] = 1;
    mins += utilNum(b.durationMin);
  });
  return { times: done.length, days: Object.keys(days).length, hours: Math.round(mins / 60) };
}

function sessionLeft(s) {
  return Math.max(0, utilNum(s.capacity) - utilNum(s.booked));
}

function sessionFull(s) {
  return sessionLeft(s) <= 0;
}

function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

function sessionExpired(s) {
  if (!s || !s.date) return false;
  var now = new Date();
  var today = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
  if (s.date < today) return true;
  if (s.date > today) return false;
  var hm = String(s.end || s.start || '00:00');
  return hm <= pad2(now.getHours()) + ':' + pad2(now.getMinutes());
}

function conflictBooking(data, date, start, end, ignoreId) {
  return (data.bookings || []).some(function (b) {
    return b.status === 'upcoming' && b.id !== ignoreId && b.date === date && !(end <= b.start || start >= b.end);
  });
}

function alreadyBookedSession(data, sid) {
  return (data.bookings || []).some(function (b) {
    return b.status === 'upcoming' && b.sessionId === sid;
  });
}

function payable(checkout, data) {
  var ck = checkout || {};
  var price = utilNum(ck.price);
  var c = findById(data.coupons, ck.couponId);
  if (c && c.status === 'unused' && price >= utilNum(c.min)) price = Math.max(0, price - utilNum(c.amount));
  return price;
}

function citiesOf(data) {
  var cities = [];
  (data.stores || []).forEach(function (s) {
    if (cities.indexOf(s.city) < 0) cities.push(s.city);
  });
  return cities;
}

module.exports = {
  STORE_KEY: STORE_KEY,
  ossUrl: ossUrl,
  labelOf: labelOf,
  findById: findById,
  emptyData: emptyData,
  loadCache: loadCache,
  saveCache: saveCache,
  currentStore: currentStore,
  remainingPkg: remainingPkg,
  unusedCoupons: unusedCoupons,
  trainStats: trainStats,
  sessionLeft: sessionLeft,
  sessionFull: sessionFull,
  sessionExpired: sessionExpired,
  conflictBooking: conflictBooking,
  alreadyBookedSession: alreadyBookedSession,
  payable: payable,
  citiesOf: citiesOf
};
