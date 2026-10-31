var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var biz = require('../../utils/biz.js');
var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    missing: false,
    c: {},
    ctaL: '',
    overlayShow: false,
    overlayMode: ''
  },
  onLoad: function (q) {
    this.setData(getApp().layout());
    this.id = q.id;
  },
  onShow: function () { this.refresh(); },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var d = getApp().getData();
    var c = store.findById(d.coaches, this.id);
    if (!c) { this.setData({ missing: true }); return; }
    getApp().globalData.ui.currentCoach = c.id;
    var remain = store.remainingPkg(d);
    this.setData({
      missing: false,
      c: c,
      ctaL: remain ? ('课包剩余 ' + remain + ' 次') : '需要先买课包'
    });
  },
  book: function () {
    if (!biz.needPhone(this)) return;
    var remain = store.remainingPkg(getApp().getData());
    if (remain <= 0) {
      getApp().globalData.ui.returnToSlots = this.id;
      this.setData({ overlayShow: true, overlayMode: 'needpkg' });
      return;
    }
    nav.go('/slots?id=' + (this.id || getApp().globalData.ui.currentCoach));
  },
  goPackages: function () {
    this.setData({ overlayShow: false });
    nav.go('/packages');
  },
  closeOverlay: function () { this.setData({ overlayShow: false }); },
  mockPhone: function () {
    biz.bindPhone(this);
  }
});
