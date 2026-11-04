var store = require('../../utils/store.js');
var nav = require('../../utils/nav.js');
var util = require('../../utils/util.js');
var share = require('../../utils/share.js');
var pull = require('../../utils/refresh.js');
var wechat = require('../../utils/wechat-profile.js');
var biz = require('../../utils/biz.js');

Page({
  data: {
    navBarHeight: 64,
    capsulePad: 96,
    loggedIn: false,
    avatar: '',
    name: '微信登录',
    loginAvatar: wechat.DEFAULT_AVATAR,
    loginNeedNick: false,
    needWxName: false,
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
    var loggedIn = wechat.isAppLoggedIn(d);
    var wxName = wechat.realNickname(d.user && d.user.nickname);
    this.setData({
      loggedIn: loggedIn,
      avatar: d.user.avatar || store.ossUrl('avatar-user'),
      name: loggedIn ? wechat.displayName(d.user.nickname) : '微信登录',
      loginAvatar: this.data.loginAvatar || d.user.avatar || wechat.DEFAULT_AVATAR,
      loginNeedNick: loggedIn ? false : this.data.loginNeedNick,
      needWxName: loggedIn && !wxName,
      pkg: store.remainingPkg(d),
      coupon: store.unusedCoupons(d).length,
      trainText: '训练记录：累计 ' + st.times + ' 次 · ' + st.days + ' 天 · ' + st.hours + ' 小时'
    });
  },
  onChooseAvatar: function (e) {
    var url = (e.detail && e.detail.avatarUrl) || '';
    if (!url) return;
    var loggedIn = this.data.loggedIn;
    this.setData({ loginAvatar: url, avatar: url });
    if (!loggedIn) return;
    var that = this;
    util.showBusy('更新头像');
    wechat.submitProfile(wechat.realNickname(getApp().getData().user && getApp().getData().user.nickname), url).then(function () {
      util.hideBusy();
      that.refresh();
    }).catch(function (err) {
      util.hideBusy();
      biz.failToast(err);
    });
  },
  onWxLogin: function (e) {
    var url = (e.detail && e.detail.avatarUrl) || '';
    if (!url) {
      util.toast('请选择微信头像');
      return;
    }
    this.setData({ loginAvatar: url, avatar: url });
    var full = getApp().globalData.serverData || getApp().getData();
    var nickname = wechat.realNickname(full.user && full.user.nickname);
    if (!nickname) {
      this.setData({ loginNeedNick: true });
      return;
    }
    this.finishLogin(nickname, url);
  },
  onNickLogin: function (e) {
    var nickname = wechat.realNickname(e.detail && e.detail.value && e.detail.value.nickname);
    if (!nickname) {
      util.toast('请点输入框选择微信昵称');
      return;
    }
    this.finishLogin(nickname, this.data.loginAvatar || this.data.avatar);
  },
  finishLogin: function (nickname, url) {
    var that = this;
    util.showBusy('登录中');
    wechat.submitProfile(nickname, url).then(function () {
      util.hideBusy();
      util.toast('微信登录成功');
      that.setData({ loginNeedNick: false });
      that.refresh();
    }).catch(function (err) {
      util.hideBusy();
      biz.failToast(err);
    });
  },
  goPath: function (e) {
    nav.go(e.currentTarget.dataset.path);
  },
  logout: function () {
    var that = this;
    wechat.logoutSession().then(function (res) {
      if (res && res.cancelled) return;
      that.refresh();
    }).catch(biz.failToast);
  },
  contactCs: function () {
    util.toast('请在微信中联系门店客服，电话见门店详情');
  },
  onShareAppMessage: share.onShareAppMessage
});
