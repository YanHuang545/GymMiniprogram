var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var biz = require('../../utils/biz.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    missing: false,
    session: {},
    coachName: '',
    storeName: '',
    left: 0,
    priceText: '',
    originText: '',
    dateText: '',
    ctaText: '立即预约',
    ctaDisabled: false,
    overlayShow: false,
    overlayMode: ''
  },
  onLoad: function (q) {
    this.setData(getApp().layout());
    this.id = q.id;
  },
  onShow: function () {
    this.refresh();
  },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var d = getApp().getData();
    var s = store.findById(d.sessions, this.id);
    if (!s) {
      this.setData({ missing: true });
      return;
    }
    var c = store.findById(d.coaches, s.coachId) || {};
    var st = store.findById(d.stores, s.storeId) || {};
    var left = store.sessionLeft(s);
    var expired = store.sessionExpired(s);
    this.setData({
      missing: false,
      session: s,
      coachName: c.name || '',
      storeName: st.name || '',
      left: left,
      priceText: util.money(s.price),
      originText: s.originPrice ? util.money(s.originPrice) : '',
      dateText: util.md(s.date),
      ctaText: expired ? '这节课已经过期' : left <= 0 ? '已满员' : '立即预约',
      ctaDisabled: expired || left <= 0
    });
  },
  book: function () {
    var d = getApp().getData();
    var s = store.findById(d.sessions, this.id);
    if (!s || store.sessionExpired(s)) return util.toast('这节课已经过期');
    if (store.sessionFull(s)) return util.toast('这节课已满员');
    if (!biz.needPhone(this)) return;
    if (store.alreadyBookedSession(d, s.id)) return util.toast('你已经约过这节课了');
    if (store.conflictBooking(d, s.date, s.start, s.end)) return util.toast('这个时间你已经有课了，先取消原来那节');
    biz.startCheckout({
      kind: 'group',
      sessionId: s.id,
      title: s.name,
      price: s.price,
      when: util.md(s.date) + ' ' + s.start + '-' + s.end,
      place: (store.findById(d.stores, s.storeId) || {}).name,
      date: s.date,
      start: s.start,
      end: s.end,
      storeId: s.storeId,
      cover: s.cover,
      durationMin: s.durationMin,
      extra: '教练 ' + (store.findById(d.coaches, s.coachId) || {}).name,
      rule: '开课前 6 小时可取消，超时不可退；退款原路返回微信支付。'
    });
  },
  closeOverlay: function () { this.setData({ overlayShow: false }); },
  mockPhone: function () {
    biz.bindPhone(this);
  }
});
