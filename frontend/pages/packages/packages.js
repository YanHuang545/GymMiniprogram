var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

Page({
  data: { navBarHeight: 64, list: [], coaches: [] },
  onLoad: function () { this.setData(getApp().layout()); },
  onShow: function () { this.refresh(); },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var d = getApp().getData();
    this.setData({
      list: (d.packages || []).map(function (p) {
        return Object.assign({}, p, { priceText: util.money(p.price) });
      }),
      coaches: d.coaches || []
    });
  },
  goPkg: function (e) { nav.go('/package?id=' + e.currentTarget.dataset.id); },
  goCoach: function (e) { nav.go('/coach?id=' + e.currentTarget.dataset.id); }
});
