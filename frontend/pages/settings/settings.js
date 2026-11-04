var util = require('../../utils/util.js');
var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

var LEGAL = {
  user: { t: '用户协议', b: '燃练提供团课、私教课包与训练营的预约购买服务。按次付费，不办年卡。取消规则以课程详情及下单页为准。开课前 6 小时可自助取消。' },
  privacy: { t: '隐私政策', b: '我们收集头像、昵称与手机号，仅用于上课提醒和售后。不会把资料卖给第三方。你可以在设置中注销账号。' },
  about: { t: '关于我们', b: '燃练 · 健身房预约 演示版。一期只做能约课、能收钱、能退款。本页为本地演示，支付为模拟。' }
};

Page({
  data: {
    navBarHeight: 64,
    overlayShow: false,
    legalTitle: '',
    legalBody: '',
    logoutLabel: '注销账号'
  },
  onLoad: function () {
    var layout = getApp().layout();
    layout.logoutLabel = this.isWechatUser() ? '退出登录' : '注销账号';
    this.setData(layout);
  },
  onPullDownRefresh: pull.onPullDownRefresh,
  isWechatUser: function () {
    var user = getApp().getData().user;
    return !!(user && user.id && user.id !== 'U001');
  },
  showLegal: function (e) {
    var x = LEGAL[e.currentTarget.dataset.id] || LEGAL.about;
    this.setData({ overlayShow: true, legalTitle: x.t, legalBody: x.b });
  },
  closeOverlay: function () { this.setData({ overlayShow: false }); },
  logout: function () {
    var wechatProfile = require('../../utils/wechat-profile.js');
    wechatProfile.logoutSession().then(function (res) {
      if (res && res.cancelled) return;
      nav.go('/profile');
    }).catch(function (err) {
      util.toast((err && err.message) || '操作失败');
    });
  }
});
