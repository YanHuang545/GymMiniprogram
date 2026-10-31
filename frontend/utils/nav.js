var TABS = {
  home: '/pages/home/home',
  venues: '/pages/venues/venues',
  schedule: '/pages/schedule/schedule',
  activities: '/pages/activities/activities',
  profile: '/pages/profile/profile'
};

var PAGES = {
  auth: '/pages/auth/auth',
  stores: '/pages/stores/stores',
  store: '/pages/store/store',
  class: '/pages/class/class',
  confirm: '/pages/confirm/confirm',
  result: '/pages/result/result',
  packages: '/pages/packages/packages',
  package: '/pages/package/package',
  coaches: '/pages/coaches/coaches',
  coach: '/pages/coach/coach',
  slots: '/pages/slots/slots',
  camps: '/pages/camps/camps',
  camp: '/pages/camp/camp',
  venue: '/pages/venue/venue',
  activity: '/pages/activity/activity',
  bookings: '/pages/bookings/bookings',
  booking: '/pages/booking/booking',
  orders: '/pages/orders/orders',
  order: '/pages/order/order',
  refund: '/pages/refund/refund',
  'my-packages': '/pages/my-packages/my-packages',
  coupons: '/pages/coupons/coupons',
  enterprise: '/pages/enterprise/enterprise',
  settings: '/pages/settings/settings'
};

function parsePath(path) {
  var raw = String(path || '/home').replace(/^#/, '');
  if (raw.indexOf('/') !== 0) raw = '/' + raw;
  var parts = raw.split('?');
  var name = parts[0].replace(/^\//, '').split('/')[0] || 'home';
  var query = {};
  (parts[1] || '').split('&').forEach(function (pair) {
    if (!pair) return;
    var kv = pair.split('=');
    query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
  });
  return { name: name, query: query, qs: parts[1] || '' };
}

function go(path, opt) {
  opt = opt || {};
  var parsed = parsePath(path);
  var app = getApp();
  if (TABS[parsed.name]) {
    if (parsed.name === 'schedule' && parsed.query.tab) {
      app.globalData.ui.schTab = parsed.query.tab;
    }
    wx.switchTab({ url: TABS[parsed.name] });
    return;
  }
  var url = PAGES[parsed.name];
  if (!url) {
    wx.switchTab({ url: TABS.home });
    return;
  }
  if (parsed.qs) url += '?' + parsed.qs;
  var method = opt.replace ? wx.redirectTo : wx.navigateTo;
  method({
    url: url,
    fail: function () {
      wx.redirectTo({
        url: url,
        fail: function () {
          wx.switchTab({ url: TABS.home });
        }
      });
    }
  });
}

function back(fallback) {
  wx.navigateBack({
    fail: function () {
      go(fallback || '/home');
    }
  });
}

function setTab(page, index) {
  if (typeof page.getTabBar === 'function') {
    var bar = page.getTabBar();
    if (bar && typeof bar.setData === 'function') {
      bar.setData({ selected: index });
    } else if (typeof page.getTabBar === 'function') {
      page.getTabBar(function (tabBar) {
        if (tabBar) tabBar.setData({ selected: index });
      });
    }
  }
}

module.exports = {
  TABS: TABS,
  PAGES: PAGES,
  parsePath: parsePath,
  go: go,
  back: back,
  setTab: setTab
};
