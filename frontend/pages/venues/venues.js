var store = require('../../utils/store.js');
var nav = require('../../utils/nav.js');
var util = require('../../utils/util.js');
var share = require('../../utils/share.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    list: [],
    fb: ''
  },
  onLoad: function () {
    this.setData(Object.assign(getApp().layout(), { fb: store.ossUrl('venue-pilates') }));
  },
  onShow: function () {
    nav.setTab(this, 1);
    var that = this;
    getApp().whenReady().then(function () {
      that.refresh();
    }).catch(function () {});
  },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var d = getApp().getData();
    this.setData({
      list: (d.venues || []).map(function (v) {
        return Object.assign({}, v, { priceText: util.money(v.price) });
      })
    });
  },
  goVenue: function (e) {
    nav.go('/venue?id=' + e.currentTarget.dataset.id);
  },
  onShareAppMessage: share.onShareAppMessage
});
