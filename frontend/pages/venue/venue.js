var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var biz = require('../../utils/biz.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    missing: false,
    v: {},
    priceText: '',
    overlayShow: false
  },
  onLoad: function (q) {
    this.setData(getApp().layout());
    this.id = q.id;
  },
  onShow: function () { this.refresh(); },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var v = store.findById(getApp().getData().venues, this.id);
    if (!v) { this.setData({ missing: true }); return; }
    this.setData({ missing: false, v: v, priceText: util.money(v.price) });
  },
  book: function () {
    var v = this.data.v;
    if (!v || !v.id) return;
    if (!biz.needPhone(this)) return;
    var date = util.ymd(util.addDays(util.today(), 7));
    biz.startCheckout({
      kind: 'venue',
      venueId: v.id,
      title: v.name + ' 体验',
      price: v.price,
      when: util.md(date) + ' 体验场',
      place: v.address,
      date: date,
      start: '10:00',
      end: '11:00',
      cover: v.cover,
      cancelHours: v.cancelHours,
      extra: '单次体验',
      rule: '开场前 ' + v.cancelHours + ' 小时可取消。'
    });
  },
  closeOverlay: function () { this.setData({ overlayShow: false }); },
  mockPhone: function () {
    biz.bindPhone(this);
  }
});
