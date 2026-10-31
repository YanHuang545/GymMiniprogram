var util = require('../../utils/util.js');
var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

Page({
  data: { navBarHeight: 64, list: [] },
  onLoad: function () { this.setData(getApp().layout()); },
  onShow: function () { this.refresh(); },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    this.setData({
      list: (getApp().getData().camps || []).map(function (m) {
        return Object.assign({}, m, {
          priceText: util.money(m.price),
          startText: util.md(m.startDate),
          left: m.capacity - m.booked
        });
      })
    });
  },
  goCamp: function (e) { nav.go('/camp?id=' + e.currentTarget.dataset.id); }
});
