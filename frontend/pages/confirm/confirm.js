var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var biz = require('../../utils/biz.js');
var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    missing: false,
    rows: [],
    couponLine: '',
    showCoupon: true,
    rule: '',
    payText: '',
    ctaText: '去支付',
    overlayShow: false,
    overlayMode: '',
    couponItems: [],
    payAmount: '',
    paying: false,
    submitting: false
  },
  onLoad: function () {
    this.setData(getApp().layout());
  },
  onShow: function () {
    this.refresh();
  },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var d = getApp().getData();
    var ck = getApp().globalData.ui.checkout;
    if (!ck) {
      this.setData({ missing: true });
      return;
    }
    var c = store.findById(d.coupons, ck.couponId);
    var pay = ck.payType === 'times' ? 0 : store.payable(ck, d);
    this.setData({
      missing: false,
      rows: [
        { k: '项目', v: ck.title },
        { k: '时间', v: ck.when },
        { k: '门店', v: ck.place },
        { k: '说明', v: ck.extra || '按次付费' }
      ],
      showCoupon: ck.useCoupon !== false,
      couponLine: c ? (c.name + ' -¥' + c.amount) : '未使用 ▾',
      rule: ck.rule || '开课前 6 小时可取消，超时不可自助退；退款原路返回。',
      payText: ck.payType === 'times' ? '扣 1 次' : util.money(pay),
      ctaText: ck.payType === 'times' ? '确认预约' : '去支付'
    });
  },
  pickCoupon: function () {
    var list = store.unusedCoupons(getApp().getData());
    this.setData({
      overlayShow: true,
      overlayMode: 'coupon',
      couponItems: [{ id: '', name: '不使用优惠券' }].concat(list.map(function (c) {
        return { id: c.id, name: c.name + ' · 满' + c.min + '减' + c.amount };
      }))
    });
  },
  useCoupon: function (e) {
    var ck = getApp().globalData.ui.checkout;
    if (ck) ck.couponId = e.currentTarget.dataset.id;
    this.setData({ overlayShow: false });
    this.refresh();
  },
  goPay: function () {
    var ck = getApp().globalData.ui.checkout;
    if (!ck || ck.payType === 'times') return;
    if (this.data.submitting) return;
    var that = this;
    this.setData({ submitting: true });
    biz.goPay().then(function (order) {
      that.setData({ submitting: false });
      if (!order) return;
      that.order = order;
      that.setData({
        overlayShow: true,
        overlayMode: 'pay',
        payAmount: util.money(order.amount),
        paying: false
      });
    }).catch(function () {
      that.setData({ submitting: false });
    });
  },
  confirmPay: function () {
    if (this.data.paying) return;
    var that = this;
    this.setData({ paying: true });
    util.showBusy('支付中');
    setTimeout(function () {
      that.setData({ overlayShow: false });
      biz.doPaySuccess(that.order).catch(function () {
        that.setData({ paying: false });
      });
    }, 280);
  },
  closeOverlay: function () {
    this.setData({ overlayShow: false });
  }
});
