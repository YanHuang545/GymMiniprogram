var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var biz = require('../../utils/biz.js');
var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    missing: false,
    a: {},
    storeName: '',
    dateText: '',
    feeText: '',
    statusText: '',
    ctaText: '报名',
    ctaL: '',
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
    var a = store.findById(d.activities, this.id);
    if (!a) { this.setData({ missing: true }); return; }
    var ctaText = a.paid ? '支付报名' : '立即报名';
    var ctaDisabled = false;
    var ctaL = a.paid ? util.money(a.price) : '免费';
    if (a.status === 'ended' || store.sessionExpired(a)) {
      ctaText = a.status === 'ended' ? '已结束' : '已过预约时间';
      ctaDisabled = true;
      ctaL = '只可浏览';
    } else if (a.booked >= a.capacity) { ctaText = '已满'; ctaDisabled = true; }
    this.setData({
      missing: false,
      a: a,
      storeName: (store.findById(d.stores, a.storeId) || {}).name || '',
      dateText: util.md(a.date),
      feeText: a.paid ? ('报名费 ' + util.money(a.price)) : '免费活动',
      statusText: store.labelOf(a.status),
      ctaText: ctaText,
      ctaL: ctaL,
      ctaDisabled: ctaDisabled
    });
  },
  join: function () {
    var d = getApp().getData();
    var a = store.findById(d.activities, this.id);
    if (!a || a.status === 'ended' || this.data.ctaDisabled) return;
    if (!biz.needPhone(this)) return;
    if (a.paid) {
      biz.startCheckout({
        kind: 'activity',
        activityId: a.id,
        title: a.name,
        price: a.price,
        when: util.md(a.date) + ' ' + a.time,
        place: (store.findById(d.stores, a.storeId) || {}).name,
        date: a.date,
        storeId: a.storeId,
        cover: a.cover,
        extra: '活动报名'
      });
    } else {
      var api = require('../../utils/api.js');
      util.showBusy('报名中');
      api.post('/api/activities/' + a.id + '/join-free').then(function () {
        return getApp().sync();
      }).then(function () {
        util.toast('报名成功');
        nav.go('/bookings');
      }).catch(biz.failToast);
    }
  },
  contactCs: function () {
    util.toast('请在微信中联系门店客服，电话见门店详情');
  },
  closeOverlay: function () { this.setData({ overlayShow: false }); },
  mockPhone: function () {
    biz.bindPhone(this);
  }
});
