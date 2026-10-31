var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

Page({
  data: { navBarHeight: 64, list: [] },
  onLoad: function () { this.setData(getApp().layout()); },
  onShow: function () { this.refresh(); },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    this.setData({ list: getApp().getData().coaches || [] });
  },
  goCoach: function (e) { nav.go('/coach?id=' + e.currentTarget.dataset.id); }
});
