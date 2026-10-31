var store = require('./utils/store.js');
var util = require('./utils/util.js');
var nav = require('./utils/nav.js');
var icons = require('./utils/icons.js');
var api = require('./utils/api.js');
var cloudConfig = require('./utils/cloud-config.js');

App({
  globalData: {
    statusBarHeight: 20,
    navBarHeight: 64,
    capsulePad: 96,
    data: null,
    cloudReady: false,
    cloud: null,
    bootPromise: null,
    icons: icons.ICONS,
    ui: {
      bannerIndex: 0,
      schTab: 'group',
      schDate: '',
      schType: 'all',
      schStore: 'all',
      actTab: 'open',
      bookingTab: 'upcoming',
      selectedSlot: '',
      slotDate: '',
      checkout: null,
      currentPkg: '',
      currentCoach: '',
      rescheduleId: '',
      returnToSlots: '',
      ddCity: '',
      pendingAuth: false
    }
  },

  onLaunch: function () {
    this.initLayout();
    this.globalData.data = store.loadCache() || store.emptyData();
    var that = this;
    util.showBusy('加载中');
    this.globalData.bootPromise = this.prepareCloud().then(function () {
      return that.sync();
    }).then(function (data) {
      util.hideBusy();
      return data;
    });
  },

  prepareCloud: function () {
    var that = this;
    var env = cloudConfig.env || 'cloud1-d9geo9d5d2420afe8';
    return new Promise(function (resolve) {
      if (that.globalData.cloudReady && that.globalData.cloud) {
        resolve(true);
        return;
      }
      if (typeof wx.cloud === 'undefined') {
        console.error('wx.cloud missing');
        resolve(false);
        return;
      }
      try {
        wx.cloud.init({
          env: env,
          traceUser: true
        });
      } catch (e) {
        console.error('wx.cloud.init', e);
      }
      if (typeof wx.cloud.Cloud === 'function') {
        try {
          var inst = new wx.cloud.Cloud({
            resourceEnv: env,
            traceUser: true
          });
          var ret = inst.init();
          if (ret && typeof ret.then === 'function') {
            ret
              .then(function () {
                that.globalData.cloud = inst;
                that.globalData.cloudReady = true;
                resolve(true);
              })
              .catch(function (err) {
                console.error('Cloud.init', err);
                that.globalData.cloud = wx.cloud;
                that.globalData.cloudReady = true;
                resolve(true);
              });
            return;
          }
          that.globalData.cloud = inst;
          that.globalData.cloudReady = true;
          resolve(true);
          return;
        } catch (e) {
          console.error('new Cloud', e);
        }
      }
      that.globalData.cloud = wx.cloud;
      that.globalData.cloudReady = true;
      resolve(true);
    });
  },

  initLayout: function () {
    var sys = {};
    try {
      sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    } catch (e) {
      sys = { statusBarHeight: 20, windowWidth: 375 };
    }
    var menu = { top: 26, bottom: 58, left: 281, width: 87, height: 32 };
    try {
      menu = wx.getMenuButtonBoundingClientRect() || menu;
    } catch (e) {}
    var statusBarHeight = sys.statusBarHeight || 20;
    var gap = Math.max(4, (menu.top || 26) - statusBarHeight);
    var navBarHeight = (menu.bottom || (statusBarHeight + 44)) + gap;
    var capsulePad = Math.max(96, (sys.windowWidth || 375) - (menu.left || 281) + 8);
    this.globalData.statusBarHeight = statusBarHeight;
    this.globalData.navBarHeight = navBarHeight;
    this.globalData.capsulePad = capsulePad;
  },

  applyServerData: function (data) {
    this.globalData.data = data;
    store.saveCache(data);
    if (!data.user.seenAuth) this.globalData.ui.pendingAuth = true;
    return data;
  },

  sync: function () {
    var that = this;
    this.globalData.bootPromise = api.get('/api/bootstrap').then(function (data) {
      return that.applyServerData(data);
    }).catch(function (err) {
      console.error('bootstrap failed', err);
      util.toast(err.message || '服务暂不可用');
      if (!that.globalData.data) that.globalData.data = store.emptyData();
      return that.globalData.data;
    });
    return this.globalData.bootPromise;
  },

  whenReady: function () {
    return this.globalData.bootPromise || Promise.resolve(this.globalData.data);
  },

  getData: function () {
    if (!this.globalData.data) this.globalData.data = store.emptyData();
    return this.globalData.data;
  },

  layout: function () {
    return {
      statusBarHeight: this.globalData.statusBarHeight,
      navBarHeight: this.globalData.navBarHeight,
      capsulePad: this.globalData.capsulePad,
      icons: this.globalData.icons
    };
  },

  go: nav.go,
  back: nav.back,
  toast: util.toast,
  money: util.money,
  md: util.md,
  store: store,
  util: util,
  nav: nav,
  api: api
});
