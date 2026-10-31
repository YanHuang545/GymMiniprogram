var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    missing: false,
    ok: false,
    title: '',
    when: '',
    headline: ''
  },
  onLoad: function (q) {
    this.setData(getApp().layout());
    this.id = q.id;
  },
  onShow: function () { this.refresh(); },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var d = getApp().getData();
    var o = store.findById(d.orders, this.id) || d.orders[d.orders.length - 1];
    if (!o) {
      this.setData({ missing: true });
      return;
    }
    var ok = o.status === 'paid' || o.status === 'refunded' || o.status === 'refunding';
    if (o.status === 'pending_payment' || o.status === 'closed') ok = false;
    this.setData({
      missing: false,
      ok: ok,
      title: o.title,
      when: o.when || '',
      headline: ok ? (o.kind === 'package' ? '购买成功' : '预约成功') : '未完成支付'
    });
  },
  enableNotify: function () {
    var api = require('../../utils/api.js');
    api.post('/api/user/notify').then(function (payload) {
      getApp().applyServerData(payload);
      util.toast('已开启上课提醒');
    }).catch(function (err) {
      util.toast((err && err.message) || '设置失败');
    });
  },
  goBookings: function () { nav.go('/bookings'); },
  goHome: function () { nav.go('/home'); }
});
