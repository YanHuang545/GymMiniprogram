var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var biz = require('../../utils/biz.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    missing: false,
    p: {},
    priceText: '',
    originText: '',
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
    var p = store.findById(d.packages, this.id);
    if (!p) { this.setData({ missing: true }); return; }
    getApp().globalData.ui.currentPkg = p.id;
    this.setData({
      missing: false,
      p: p,
      priceText: util.money(p.price),
      originText: util.money(p.originPrice)
    });
  },
  buy: function () {
    var p = this.data.p;
    if (!p || !p.id) return;
    if (!biz.needPhone(this)) return;
    biz.startCheckout({
      kind: 'package',
      packageId: p.id,
      title: p.name,
      price: p.price,
      when: '购买后立即到账',
      place: store.currentStore(getApp().getData()).name,
      extra: p.sessions + ' 节 · ' + p.validDays + ' 天',
      rule: '一节都没用可全额退；用过后按剩余节数折算。'
    });
  },
  closeOverlay: function () { this.setData({ overlayShow: false }); },
  mockPhone: function () {
    biz.bindPhone(this);
  }
});
