var util = require('../../utils/util.js');
var nav = require('../../utils/nav.js');
var api = require('../../utils/api.js');
var biz = require('../../utils/biz.js');
var pull = require('../../utils/refresh.js');

Page({
  data: { navBarHeight: 64 },
  onLoad: function () {
    this.setData(getApp().layout());
  },
  onPullDownRefresh: pull.onPullDownRefresh,
  agree: function () {
    var that = this;
    api.post('/api/auth/agree').then(biz.applyData).then(function () {
      util.toast('授权成功');
      that.leave();
    }).catch(biz.failToast);
  },
  skip: function () {
    var that = this;
    api.post('/api/auth/skip').then(biz.applyData).then(function () {
      that.leave();
    }).catch(biz.failToast);
  },
  leave: function () {
    wx.navigateBack({
      fail: function () {
        nav.go('/home');
      }
    });
  }
});
