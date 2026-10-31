var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var nav = require('../../utils/nav.js');
var biz = require('../../utils/biz.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    cities: [],
    city: '',
    list: [],
    currentStoreId: '',
    fb: ''
  },
  onLoad: function () {
    this.setData(Object.assign(getApp().layout(), { fb: store.ossUrl('store-jinbao') }));
  },
  onShow: function () { this.refresh(); },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    var d = getApp().getData();
    var cities = store.citiesOf(d);
    var city = d.user.currentCity;
    this.setData({
      cities: cities,
      city: city,
      currentStoreId: d.user.currentStoreId,
      list: d.stores.filter(function (s) { return s.city === city; })
    });
  },
  pickCity: function (e) {
    var that = this;
    biz.setStore('', e.currentTarget.dataset.id).then(function () {
      that.refresh();
    });
  },
  pickStore: function (e) {
    var id = e.currentTarget.dataset.id;
    var d = getApp().getData();
    var st = store.findById(d.stores, id);
    if (!st) return;
    biz.setStore(id).then(function () {
      util.toast('已切换到' + st.name);
      nav.go('/home');
    });
  }
});
