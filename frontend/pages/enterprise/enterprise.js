var util = require('../../utils/util.js');
var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    company: '',
    name: '',
    phone: '',
    need: '',
    e1: '',
    e2: '',
    e3: '',
    e4: ''
  },
  onLoad: function () { this.setData(getApp().layout()); },
  onPullDownRefresh: pull.onPullDownRefresh,
  onCompany: function (e) { this.setData({ company: e.detail.value }); },
  onName: function (e) { this.setData({ name: e.detail.value }); },
  onPhone: function (e) { this.setData({ phone: e.detail.value }); },
  onNeed: function (e) { this.setData({ need: e.detail.value }); },
  submit: function () {
    var company = (this.data.company || '').trim();
    var name = (this.data.name || '').trim();
    var phone = (this.data.phone || '').trim();
    var need = (this.data.need || '').trim();
    var e1 = company ? '' : '请填写公司名';
    var e2 = name ? '' : '请填写联系人';
    var e3 = /^1\d{10}$/.test(phone) ? '' : '请填写 11 位手机号';
    var e4 = need ? '' : '请填写需求';
    this.setData({ e1: e1, e2: e2, e3: e3, e4: e4 });
    if (e1 || e2 || e3 || e4) return;
    var api = require('../../utils/api.js');
    api.post('/api/enterprise', {
      company: company,
      name: name,
      phone: phone,
      need: need
    }).then(function () {
      return getApp().sync();
    }).then(function () {
      util.toast('我们会电话联系你');
      nav.go('/profile');
    }).catch(function (err) {
      util.toast((err && err.message) || '提交失败');
    });
  }
});
