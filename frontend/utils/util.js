function pad(n) {
  return String(n).padStart(2, '0');
}

function ymd(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function today() {
  var d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function parseDT(date, hm) {
  var p = String(hm || '00:00').split(':');
  return new Date(date + 'T' + pad(p[0]) + ':' + pad(p[1]) + ':00');
}

function weekLabel(d) {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
}

function md(dateStr) {
  var p = String(dateStr).split('-');
  return num(p[1]) + '月' + num(p[2]) + '日';
}

function text(v, fb) {
  if (v === undefined || v === null || v === '') return fb === undefined ? '-' : fb;
  return String(v);
}

function num(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

function money(v) {
  return '¥' + num(v);
}

function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1000);
}

var busyOn = false;

function showBusy(title) {
  busyOn = true;
  wx.showLoading({
    title: title || '请稍候',
    mask: true
  });
}

function hideBusy() {
  if (!busyOn) return;
  busyOn = false;
  wx.hideLoading();
}

function toast(msg) {
  hideBusy();
  wx.showToast({ title: String(msg || ''), icon: 'none', duration: 2000 });
}

function confirmDialog(title, desc, okText) {
  return new Promise(function (resolve) {
    wx.showModal({
      title: title || '提示',
      content: desc || '',
      confirmText: okText || '确定',
      confirmColor: '#ff4a1a',
      success: function (res) {
        resolve(!!res.confirm);
      },
      fail: function () {
        resolve(false);
      }
    });
  });
}

module.exports = {
  pad: pad,
  ymd: ymd,
  today: today,
  addDays: addDays,
  parseDT: parseDT,
  weekLabel: weekLabel,
  md: md,
  text: text,
  num: num,
  money: money,
  uid: uid,
  showBusy: showBusy,
  hideBusy: hideBusy,
  toast: toast,
  confirmDialog: confirmDialog
};
