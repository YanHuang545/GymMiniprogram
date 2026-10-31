var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    title: '门店详情',
    s: {},
    gallery: [],
    hours: ''
  },
  onLoad: function (q) {
    this.setData(getApp().layout());
    this.id = q.id;
  },
  onShow: function () { this.refresh(); },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var d = getApp().getData();
    var s = store.findById(d.stores, this.id) || store.currentStore(d);
    this.setData({
      s: s,
      title: s.name,
      gallery: s.gallery && s.gallery.length ? s.gallery : [s.cover],
      hours: s.hours
    });
  },
  preview: function (e) {
    var url = e.currentTarget.dataset.url;
    wx.previewImage({ current: url, urls: this.data.gallery });
  },
  callPhone: function () {
    var phone = this.data.s.phone;
    wx.makePhoneCall({
      phoneNumber: String(phone || '').replace(/-/g, ''),
      fail: function () { util.toast('演示环境请自行拨打 ' + phone); }
    });
  },
  copyAddr: function () {
    wx.setClipboardData({
      data: this.data.s.address || '',
      success: function () { util.toast('地址已复制'); }
    });
  },
  goSchedule: function () { nav.go('/schedule'); }
});
