var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var pull = require('../../utils/refresh.js');

Page({
  data: { navBarHeight: 64, list: [], empty: false },
  onLoad: function () { this.setData(getApp().layout()); },
  onShow: function () {
    this.refresh();
    pull.fromServer(this, { busy: false });
  },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var list = (getApp().getData().coupons || []).map(function (c) {
      return Object.assign({}, c, {
        amountText: util.money(c.amount),
        statusText: store.labelOf(c.status),
        expireText: util.md(c.expire),
        used: c.status !== 'unused'
      });
    });
    this.setData({ list: list, empty: !list.length });
  }
});
