var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

Page({
  data: { navBarHeight: 64, tab: 'upcoming', list: [], emptyText: '' },

  onLoad: function () {
    this.setData(getApp().layout());
  },

  onShow: function () {
    this.refresh();
    pull.fromServer(this, { busy: false });
  },

  onPullDownRefresh: pull.onPullDownRefresh,

  refresh: function () {
    var d = getApp().getData();
    var tab = getApp().globalData.ui.bookingTab || 'upcoming';
    var list = (d.bookings || []).filter(function (b) {
      return b.status === tab;
    }).sort(function (a, b) {
      return (b.date + b.start).localeCompare(a.date + a.start);
    }).map(function (b) {
      var st = store.findById(d.stores, b.storeId) || {};
      return Object.assign({}, b, {
        statusText: store.labelOf(b.status),
        dateText: util.md(b.date),
        storeName: st.name || ''
      });
    });
    this.setData({
      tab: tab,
      list: list,
      emptyText: list.length ? '' : '这一栏还没有预约'
    });
  },

  onTab: function (e) {
    getApp().globalData.ui.bookingTab = e.currentTarget.dataset.id;
    this.refresh();
  },

  goItem: function (e) {
    nav.go('/booking?id=' + e.currentTarget.dataset.id);
  }
});
