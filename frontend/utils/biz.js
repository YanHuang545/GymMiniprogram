var store = require('./store.js');
var util = require('./util.js');
var nav = require('./nav.js');
var api = require('./api.js');

function data() {
  return getApp().getData();
}

function toast(msg) {
  util.toast(msg);
}

function applyData(payload) {
  if (payload && payload.user) {
    getApp().applyServerData(payload);
    return Promise.resolve(payload);
  }
  return getApp().sync();
}

function failToast(err) {
  toast((err && err.message) || '操作失败');
  return Promise.reject(err);
}

function needPhone(page) {
  var d = data();
  if (d.user.phone) return true;
  page.setData({
    overlayShow: true,
    overlayMode: 'phone'
  });
  return false;
}

function bindPhone(page, phone) {
  return api.post('/api/auth/phone', { phone: phone || '13800138000' }).then(function (payload) {
    return applyData(payload);
  }).then(function () {
    if (page) page.setData({ overlayShow: false });
    toast('已授权手机号');
  }).catch(failToast);
}

function setStore(storeId, city) {
  return api.post('/api/user/store', { storeId: storeId || '', city: city || '' }).then(applyData).catch(failToast);
}

function startCheckout(payload) {
  payload.couponId = payload.couponId || '';
  getApp().globalData.ui.checkout = payload;
  nav.go('/confirm');
}

function slimCheckout(ck) {
  if (!ck) return null;
  return {
    kind: ck.kind || '',
    payType: ck.payType || '',
    title: ck.title || '',
    when: ck.when || '',
    place: ck.place || '',
    extra: ck.extra || '',
    couponId: ck.couponId || '',
    sessionId: ck.sessionId || '',
    packageId: ck.packageId || '',
    campId: ck.campId || '',
    venueId: ck.venueId || '',
    activityId: ck.activityId || '',
    coachId: ck.coachId || '',
    date: ck.date || '',
    start: ck.start || '',
    end: ck.end || '',
    storeId: ck.storeId || '',
    cover: ck.cover || '',
    durationMin: ck.durationMin || 60,
    cancelHours: ck.cancelHours || 6,
    price: ck.price || 0
  };
}

function isResetErr(err) {
  var msg = (err && err.message) || '';
  return msg.indexOf('-101') >= 0 || /reset/i.test(msg);
}

function goPay() {
  var ck = slimCheckout(getApp().globalData.ui.checkout);
  if (!ck) return Promise.resolve(null);
  if (ck.payType === 'times') return Promise.resolve(null);
  util.showBusy('提交中');
  return api.post('/api/checkout', ck).then(function (order) {
    util.hideBusy();
    return order;
  }).catch(function (err) {
    if (!isResetErr(err)) {
      failToast(err);
      return null;
    }
    return api.get('/api/checkout', ck).then(function (order) {
      util.hideBusy();
      return order;
    }).catch(function (err2) {
      failToast(err2);
      return null;
    });
  });
}

function doPaySuccess(order) {
  if (!order || !order.id) return Promise.resolve();
  var ui = getApp().globalData.ui;
  util.showBusy('支付中');
  return api.post('/api/orders/' + order.id + '/pay').catch(function (err) {
    if (!isResetErr(err)) throw err;
    return api.get('/api/orders/' + order.id + '/pay');
  }).then(function () {
    return getApp().sync();
  }).then(function () {
    util.hideBusy();
    if (order.kind === 'package' && ui.returnToSlots) {
      var cid = ui.returnToSlots;
      ui.returnToSlots = '';
      toast('课包已到账，继续选时间');
      nav.go('/slots?id=' + cid, { replace: true });
      return;
    }
    nav.go('/result?id=' + order.id, { replace: true });
  }).catch(failToast);
}

function confirmSlot(payload) {
  util.showBusy('预约中');
  return api.post('/api/slots/confirm', payload).then(function (result) {
    return getApp().sync().then(function () {
      util.hideBusy();
      return result;
    });
  }).catch(function (err) {
    util.hideBusy();
    throw err;
  });
}

module.exports = {
  needPhone: needPhone,
  bindPhone: bindPhone,
  setStore: setStore,
  startCheckout: startCheckout,
  goPay: goPay,
  doPaySuccess: doPaySuccess,
  confirmSlot: confirmSlot,
  toast: toast,
  applyData: applyData,
  failToast: failToast
};
