var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var pull = require('../../utils/refresh.js');

Page({
  data: { navBarHeight: 64, missing: false, amountText: '', statusText: '', done: false },
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
    var o = store.findById(getApp().getData().orders, this.id);
    if (!o) { this.setData({ missing: true }); return; }
    this.setData({
      missing: false,
      amountText: util.money(o.refundAmount || o.amount),
      statusText: store.labelOf(o.status),
      done: o.status === 'refunded'
    });
  }
});
