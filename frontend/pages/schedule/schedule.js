var store = require('../../utils/store.js');
var nav = require('../../utils/nav.js');
var util = require('../../utils/util.js');
var share = require('../../utils/share.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    schTab: 'group',
    dates: [],
    schDate: '',
    typeOn: false,
    storeOn: false,
    groups: [],
    coaches: [],
    camps: [],
    emptyText: '',
    overlayShow: false,
    overlayTitle: '',
    overlayItems: [],
    overlayKind: '',
    avatarFb: ''
  },

  onLoad: function () {
    this.setData(Object.assign(getApp().layout(), { avatarFb: store.ossUrl('avatar-user') }));
  },

  onShow: function () {
    nav.setTab(this, 2);
    var that = this;
    getApp().whenReady().then(function () {
      var ui = getApp().globalData.ui;
      that.setData({ schTab: ui.schTab || 'group' });
      that.buildDates();
      that.refresh();
    }).catch(function () {});
  },

  onPullDownRefresh: pull.onPullDownRefresh,

  buildDates: function () {
    var ui = getApp().globalData.ui;
    var t0 = util.today();
    var dates = [];
    for (var i = 0; i < 7; i++) {
      var d = util.addDays(t0, i);
      var key = util.ymd(d);
      if (!ui.schDate) ui.schDate = key;
      dates.push({
        key: key,
        num: i === 0 ? '今' : d.getDate(),
        lab: i === 0 ? '今天' : util.weekLabel(d).slice(1)
      });
    }
    this.setData({ dates: dates, schDate: ui.schDate });
  },

  refresh: function () {
    this.buildDates();
    var d = getApp().getData();
    var ui = getApp().globalData.ui;
    var tab = ui.schTab || 'group';
    this.setData({
      schTab: tab,
      typeOn: ui.schType !== 'all',
      storeOn: ui.schStore !== 'all'
    });
    if (tab === 'private') {
      this.setData({
        coaches: d.coaches,
        groups: [],
        camps: [],
        emptyText: ''
      });
      return;
    }
    if (tab === 'camp') {
      var camps = d.camps.map(this.mapCamp);
      this.setData({
        camps: camps,
        groups: [],
        coaches: [],
        emptyText: camps.length ? '' : '暂时没有训练营'
      });
      return;
    }
    var list = d.sessions.filter(function (s) {
      if (s.date !== ui.schDate) return false;
      if (ui.schStore !== 'all' && s.storeId !== ui.schStore) return false;
      if (ui.schType !== 'all' && s.courseId !== ui.schType) return false;
      return true;
    });
    if (!list.length) {
      this.setData({ groups: [], coaches: [], camps: [], emptyText: '这一天还没排课，看看前后几天' });
      return;
    }
    var map = {};
    list.forEach(function (s) {
      (map[s.storeId] = map[s.storeId] || []).push(s);
    });
    var groups = Object.keys(map).map(function (sid) {
      var st = store.findById(d.stores, sid) || {};
      return {
        id: sid,
        title: (st.name || '') + ' · 距你 ' + (st.dist || ''),
        list: map[sid].map(function (s) {
          var c = store.findById(d.coaches, s.coachId) || {};
          return Object.assign({}, s, {
            coachAvatar: c.avatar || store.ossUrl('coach-zhang'),
            coachName: c.name || '',
            full: store.sessionFull(s),
            priceText: util.money(s.price),
            originText: s.originPrice ? util.money(s.originPrice) : ''
          });
        })
      };
    });
    this.setData({ groups: groups, coaches: [], camps: [], emptyText: '' });
  },

  mapCamp: function (m) {
    return Object.assign({}, m, {
      priceText: util.money(m.price),
      startText: util.md(m.startDate),
      left: m.capacity - m.booked
    });
  },

  onTab: function (e) {
    var id = e.currentTarget.dataset.id;
    getApp().globalData.ui.schTab = id;
    this.refresh();
  },

  onDate: function (e) {
    getApp().globalData.ui.schDate = e.currentTarget.dataset.id;
    this.setData({ schDate: e.currentTarget.dataset.id });
    this.refresh();
  },

  onFilter: function (e) {
    var id = e.currentTarget.dataset.id;
    var d = getApp().getData();
    if (id === 'type') {
      this.setData({
        overlayShow: true,
        overlayTitle: '课程类型',
        overlayKind: 'type',
        overlayItems: [
          { id: 'all', name: '全部课程' },
          { id: 'C001', name: '杠铃操' },
          { id: 'C002', name: '搏击' },
          { id: 'C003', name: '瑜伽' },
          { id: 'C004', name: 'HIIT' }
        ]
      });
    } else {
      var items = [{ id: 'all', name: '全部门店' }].concat(
        d.stores.filter(function (s) { return s.city === d.user.currentCity; }).map(function (s) {
          return { id: s.id, name: s.name };
        })
      );
      this.setData({
        overlayShow: true,
        overlayTitle: '门店',
        overlayKind: 'store',
        overlayItems: items
      });
    }
  },

  closeOverlay: function () {
    this.setData({ overlayShow: false });
  },

  pickOverlay: function (e) {
    var id = e.currentTarget.dataset.id;
    if (this.data.overlayKind === 'type') getApp().globalData.ui.schType = id;
    else getApp().globalData.ui.schStore = id;
    this.setData({ overlayShow: false });
    this.refresh();
  },

  goClass: function (e) {
    nav.go('/class?id=' + e.currentTarget.dataset.id);
  },

  goCoach: function (e) {
    nav.go('/coach?id=' + e.currentTarget.dataset.id);
  },

  goCamp: function (e) {
    nav.go('/camp?id=' + e.currentTarget.dataset.id);
  },

  goPackages: function () {
    nav.go('/packages');
  },

  onShareAppMessage: share.onShareAppMessage
});
