var util = require('../../utils/util.js');
var nav = require('../../utils/nav.js');
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
    var list = (getApp().getData().ownedPackages || []).map(function (p) {
      return Object.assign({}, p, { expireText: util.md(p.expire) });
    });
    this.setData({ list: list, empty: !list.length });
  },
  goCoaches: function () { nav.go('/coaches'); },
  goPackages: function () { nav.go('/packages'); }
});
