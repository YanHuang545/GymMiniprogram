var store = require('../../utils/store.js');
var nav = require('../../utils/nav.js');
var util = require('../../utils/util.js');
var share = require('../../utils/share.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    actTab: 'open',
    list: [],
    emptyText: '',
    fb: ''
  },
  onLoad: function () {
    this.setData(Object.assign(getApp().layout(), { fb: store.ossUrl('activity-open') }));
  },
  onShow: function () {
    nav.setTab(this, 3);
    var that = this;
    getApp().whenReady().then(function () {
      that.refresh();
    }).catch(function () {});
  },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var d = getApp().getData();
    var tab = getApp().globalData.ui.actTab || 'open';
    var list = d.activities.filter(function (a) {
      return tab === 'ended' ? a.status === 'ended' : a.status !== 'ended';
    }).map(function (a) {
      var st = store.findById(d.stores, a.storeId) || {};
      return Object.assign({}, a, {
        statusText: store.labelOf(a.status),
        dateText: util.md(a.date),
        storeName: st.name || '',
        tagClass: a.status === 'open' ? 'tag tag-orange' : 'tag'
      });
    });
    this.setData({
      actTab: tab,
      list: list,
      emptyText: list.length ? '' : (tab === 'ended' ? '还没有往期活动' : '暂时没有报名中的活动')
    });
  },
  onTab: function (e) {
    getApp().globalData.ui.actTab = e.currentTarget.dataset.id;
    this.refresh();
  },
  goAct: function (e) {
    nav.go('/activity?id=' + e.currentTarget.dataset.id);
  },
  onShareAppMessage: share.onShareAppMessage
});
