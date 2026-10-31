var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var biz = require('../../utils/biz.js');
var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    missing: false,
    o: {},
    statusText: '',
    amountText: '',
    overlayShow: false,
    overlayMode: '',
    payAmount: '',
    paying: false
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
    var o = store.findById(getApp().getData().orders, this.id);
    if (!o) { this.setData({ missing: true }); return; }
    this.setData({
      missing: false,
      o: o,
      statusText: store.labelOf(o.status),
      amountText: o.amount ? util.money(o.amount) : '扣次'
    });
  },
  goRefund: function () { nav.go('/refund?id=' + this.id); },
  repay: function () {
    var o = store.findById(getApp().getData().orders, this.id);
    if (!o) return;
    this.order = o;
    this.setData({
      overlayShow: true,
      overlayMode: 'pay',
      payAmount: util.money(o.amount),
      paying: false
    });
  },
  confirmPay: function () {
    if (this.data.paying) return;
    var that = this;
    this.setData({ paying: true });
    util.showBusy('支付中');
    setTimeout(function () {
      that.setData({ overlayShow: false });
      biz.doPaySuccess(that.order).catch(function () {
        that.setData({ paying: false });
      });
    }, 280);
  },
  closeOverlay: function () { this.setData({ overlayShow: false }); }
});
