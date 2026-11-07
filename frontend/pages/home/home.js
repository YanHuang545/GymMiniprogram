var store = require('../../utils/store.js');
var nav = require('../../utils/nav.js');
var util = require('../../utils/util.js');
var biz = require('../../utils/biz.js');
var share = require('../../utils/share.js');
var pull = require('../../utils/refresh.js');

function sameBanners(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (!b[i] || a[i].id !== b[i].id || a[i].image !== b[i].image) return false;
  }
  return true;
}

Page({
  data: {
    navBarHeight: 64,
    capsulePad: 96,
    locText: '定位中',
    ddOpen: false,
    ddCity: '',
    cities: [],
    ddStores: [],
    currentStoreId: '',
    banners: [],
    bannerIndex: 0,
    bannerReady: false,
    nearStore: null,
    hotSessions: [],
    homeAct: null,
    storeFb: '',
    classFb: '',
    actFb: ''
  },

  onLoad: function () {
    this.setData(getApp().layout());
    this.setData({
      storeFb: store.ossUrl('store-jinbao'),
      classFb: store.ossUrl('class-hiit'),
      actFb: store.ossUrl('activity-open')
    });
  },

  onShow: function () {
    nav.setTab(this, 0);
    var that = this;
    getApp().whenReady().then(function () {
      getApp().globalData.ui.pendingAuth = false;
      that.refresh();
    }).catch(function () {
      that.refresh();
    });
  },

  onPullDownRefresh: pull.onPullDownRefresh,

  refresh: function () {
    var d = getApp().getData();
    var st = store.currentStore(d);
    var cities = store.citiesOf(d);
    var ddCity = this.data.ddCity || d.user.currentCity;
    var ddStores = d.stores.filter(function (s) { return s.city === ddCity; });
    var hot = d.sessions.slice(0, 4).map(function (s) {
      return Object.assign({}, s, { priceText: util.money(s.price) });
    });
    var act = d.activities[0];
    var patch = {
      locText: (d.user.currentCity || '北京') + ' · ' + (st ? st.name : '选择门店'),
      ddCity: ddCity,
      cities: cities,
      ddStores: ddStores,
      currentStoreId: d.user.currentStoreId,
      nearStore: st ? Object.assign({}, st, { closeHour: (st.hours || '').split('-')[1] || '' }) : null,
      hotSessions: hot,
      homeAct: act ? Object.assign({}, act, { statusText: store.labelOf(act.status) }) : null
    };
    if (!sameBanners(this.data.banners, d.banners)) {
      patch.banners = d.banners || [];
      patch.bannerIndex = 0;
      patch.bannerReady = false;
    }
    this.setData(patch);
    this.armBannerReady();
  },

  armBannerReady: function () {
    var that = this;
    if (that.data.bannerReady) return;
    if (!(that.data.banners || []).length) return;
    clearTimeout(that._bannerReadyTimer);
    that._bannerReadyTimer = setTimeout(function () {
      if (that.data.bannerReady) return;
      if ((that.data.banners || []).length) {
        that.setData({ bannerReady: true });
      }
    }, 600);
  },

  onPageTap: function () {
    if (this.data.ddOpen) this.setData({ ddOpen: false });
  },

  noop: function () {},

  toggleStoreDd: function () {
    var open = !this.data.ddOpen;
    if (open) {
      var d = getApp().getData();
      this.setData({ ddOpen: true, ddCity: d.user.currentCity });
      this.refresh();
    } else {
      this.setData({ ddOpen: false });
    }
  },

  pickCity: function (e) {
    this.setData({ ddCity: e.currentTarget.dataset.id });
    this.refresh();
  },

  pickStore: function (e) {
    var id = e.currentTarget.dataset.id;
    var d = getApp().getData();
    var st = store.findById(d.stores, id);
    if (!st) return;
    var that = this;
    biz.setStore(id).then(function () {
      that.setData({ ddOpen: false });
      util.toast('已切换到' + st.name);
      that.refresh();
    });
  },

  onBannerChange: function (e) {
    var src = (e.detail && e.detail.source) || '';
    if (src !== 'autoplay' && src !== 'touch') return;
    var i = e.detail.current;
    if (typeof i !== 'number' || i === this.data.bannerIndex) return;
    getApp().globalData.ui.bannerIndex = i;
    this.setData({ bannerIndex: i });
  },

  onBannerTap: function (e) {
    var link = e.currentTarget.dataset.link;
    if (link) nav.go(link);
  },

  goPath: function (e) {
    nav.go(e.currentTarget.dataset.path);
  },

  onImgError: function (e) {
    var fb = e.currentTarget.dataset.fb;
    if (!fb) return;
    var src = e.currentTarget.src;
    if (src === fb) return;
    e.currentTarget.src = fb;
  },

  onShareAppMessage: share.onShareAppMessage
});
