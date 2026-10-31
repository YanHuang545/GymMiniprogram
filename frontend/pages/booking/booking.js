var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    missing: false,
    b: {},
    code: '',
    dateText: '',
    statusText: '',
    storeName: '',
    canCancel: false,
    upcomingLocked: false
  },
  onLoad: function (q) {
    this.setData(getApp().layout());
    this.id = q.id;
  },
  onShow: function () {
    this.refresh();
    pull.fromServer(this, { busy: false });
  },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var d = getApp().getData();
    var b = store.findById(d.bookings, this.id);
    if (!b) { this.setData({ missing: true }); return; }
    var startAt = util.parseDT(b.date, b.start);
    var canCancel = b.status === 'upcoming' && (startAt.getTime() - Date.now() >= (util.num(b.cancelHours) || 6) * 3600000);
    this.setData({
      missing: false,
      b: b,
      code: String(b.id).slice(-6).toUpperCase(),
      dateText: util.md(b.date),
      statusText: store.labelOf(b.status),
      storeName: (store.findById(d.stores, b.storeId) || {}).name || '',
      canCancel: canCancel,
      upcomingLocked: b.status === 'upcoming' && !canCancel
    });
  },
  cancel: function () {
    var that = this;
    util.confirmDialog('取消预约', '取消后名额让给别人，钱原路退回。', '确认取消').then(function (ok) {
      if (!ok) return;
      var api = require('../../utils/api.js');
      util.showBusy('取消中');
      api.post('/api/bookings/' + that.id + '/cancel').then(function () {
        getApp().globalData.ui.bookingTab = 'cancelled';
        return getApp().sync();
      }).then(function () {
        util.toast('已取消，退款将在几分钟内原路退回');
        that.refresh();
      }).catch(function (err) {
        util.toast((err && err.message) || '取消失败');
      });
    });
  },
  reschedule: function () {
    var b = this.data.b;
    if (!b || b.kind !== 'private') return;
    getApp().globalData.ui.rescheduleId = b.id;
    getApp().globalData.ui.currentCoach = b.coachId;
    nav.go('/slots?id=' + b.coachId);
  },
  goOrder: function () {
    if (this.data.b.orderId) nav.go('/order?id=' + this.data.b.orderId);
  }
});
