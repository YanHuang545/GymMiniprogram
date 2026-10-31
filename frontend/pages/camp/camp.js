var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var biz = require('../../utils/biz.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    missing: false,
    m: {},
    coachName: '',
    storeName: '',
    schedule: '',
    left: 0,
    startText: '',
    priceText: '',
    ctaText: '立即报名',
    ctaDisabled: false,
    overlayShow: false
  },
  onLoad: function (q) {
    this.setData(getApp().layout());
    this.id = q.id;
  },
  onShow: function () { this.refresh(); },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var d = getApp().getData();
    var m = store.findById(d.camps, this.id);
    if (!m) { this.setData({ missing: true }); return; }
    var left = m.capacity - m.booked;
    var notOpen = m.enrollStart > util.ymd(util.today());
    var ctaText = '立即报名';
    var ctaDisabled = false;
    if (notOpen) { ctaText = '报名未开始'; ctaDisabled = true; }
    else if (left <= 0) { ctaText = '已满员'; ctaDisabled = true; }
    this.setData({
      missing: false,
      m: m,
      coachName: (store.findById(d.coaches, m.coachId) || {}).name || '',
      storeName: (store.findById(d.stores, m.storeId) || {}).name || '',
      schedule: (m.schedule || []).join('、'),
      left: left,
      startText: util.md(m.startDate),
      priceText: util.money(m.price),
      ctaText: ctaText,
      ctaDisabled: ctaDisabled
    });
  },
  enroll: function () {
    var d = getApp().getData();
    var m = store.findById(d.camps, this.id);
    if (!m) return;
    if (m.enrollStart > util.ymd(util.today())) return util.toast('报名未开始');
    if (m.capacity <= m.booked) return util.toast('已满员');
    if (!biz.needPhone(this)) return;
    biz.startCheckout({
      kind: 'camp',
      campId: m.id,
      title: m.name,
      price: m.price,
      when: '开营 ' + util.md(m.startDate),
      place: (store.findById(d.stores, m.storeId) || {}).name,
      date: m.startDate,
      storeId: m.storeId,
      cover: m.cover,
      extra: (m.schedule || []).join('、'),
      rule: '开营前可退；开营后请联系门店。'
    });
  },
  closeOverlay: function () { this.setData({ overlayShow: false }); },
  mockPhone: function () {
    biz.bindPhone(this);
  }
});
