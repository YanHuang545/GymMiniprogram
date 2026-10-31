var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

Page({
  data: { navBarHeight: 64, list: [], emptyText: '' },
  onLoad: function () { this.setData(getApp().layout()); },
  onShow: function () {
    this.refresh();
    pull.fromServer(this, { busy: false });
  },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var list = (getApp().getData().orders || []).slice().sort(function (a, b) {
      return b.createdAt - a.createdAt;
    }).map(function (o) {
      return Object.assign({}, o, {
        statusText: store.labelOf(o.status),
        amountText: o.amount ? util.money(o.amount) : '课包次数',
        timeText: new Date(o.createdAt).toLocaleString()
      });
    });
    this.setData({ list: list, emptyText: list.length ? '' : '还没有订单' });
  },
  goItem: function (e) { nav.go('/order?id=' + e.currentTarget.dataset.id); }
});
