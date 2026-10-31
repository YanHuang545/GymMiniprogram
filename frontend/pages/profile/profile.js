var store = require('../../utils/store.js');
var nav = require('../../utils/nav.js');
var util = require('../../utils/util.js');
var share = require('../../utils/share.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    capsulePad: 96,
    avatar: '',
    name: '点击授权登录',
    pkg: 0,
    coupon: 0,
    trainText: '',
    overlayShow: false
  },
  onLoad: function () {
    this.setData(getApp().layout());
  },
  onShow: function () {
    nav.setTab(this, 4);
    var that = this;
    getApp().whenReady().then(function () {
      that.refresh();
    }).catch(function () {});
  },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var d = getApp().getData();
    var st = store.trainStats(d);
    this.setData({
      avatar: d.user.avatar || store.ossUrl('avatar-user'),
      name: d.user.authorized ? (d.user.nickname || '燃练学员') : '点击授权登录',
      pkg: store.remainingPkg(d),
      coupon: store.unusedCoupons(d).length,
      trainText: '训练记录：累计 ' + st.times + ' 次 · ' + st.days + ' 天 · ' + st.hours + ' 小时'
    });
  },
  onAuth: function () {
    if (!getApp().getData().user.authorized) nav.go('/auth');
  },
  goPath: function (e) {
    nav.go(e.currentTarget.dataset.path);
  },
  contactCs: function () {
    util.toast('请在微信中联系门店客服，电话见门店详情');
  },
  onShareAppMessage: share.onShareAppMessage
});
