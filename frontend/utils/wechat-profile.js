var api = require('./api.js');
var biz = require('./biz.js');
var store = require('./store.js');
var util = require('./util.js');

var DEFAULT_AVATAR =
  'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';

function persistableAvatar(url) {
  var s = String(url || '');
  if (s.indexOf('cloud://') === 0) return true;
  if (s.indexOf('https://') === 0 && s.indexOf('/tmp') === -1 && s.indexOf('https://tmp') !== 0) return true;
  return false;
}

function uploadAvatar(filePath) {
  if (!filePath || filePath === DEFAULT_AVATAR) return Promise.resolve('');
  if (persistableAvatar(filePath)) return Promise.resolve(filePath);
  var cloud = null;
  try {
    var app = getApp();
    cloud = (app && app.globalData && app.globalData.cloud) || wx.cloud;
  } catch (e) {
    cloud = wx.cloud;
  }
  if (!cloud || typeof cloud.uploadFile !== 'function') {
    return Promise.resolve('');
  }
  return new Promise(function (resolve) {
    cloud.uploadFile({
      cloudPath: 'avatars/' + Date.now() + '-' + Math.floor(Math.random() * 9999) + '.jpg',
      filePath: filePath,
      success: function (res) {
        resolve((res && res.fileID) || '');
      },
      fail: function () {
        resolve('');
      }
    });
  });
}

function cleanNickname(raw) {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32);
}

function isPlaceholderName(name) {
  return (
    !name ||
    name === '林燃' ||
    name === '微信用户' ||
    name === '点击授权登录' ||
    name === '燃练学员' ||
    name === '微信登录'
  );
}

function realNickname(name) {
  var n = cleanNickname(name);
  if (n.indexOf('燃练学员：') === 0) n = cleanNickname(n.slice(5));
  if (isPlaceholderName(n)) return '';
  return n;
}

function displayName(nickname) {
  var n = realNickname(nickname);
  return n ? '燃练学员：' + n : '燃练学员';
}

function submitProfile(nickname, avatarUrl) {
  var name = realNickname(nickname);
  if (!avatarUrl && !name) {
    return Promise.reject(new Error('请选择微信头像'));
  }
  var upload = avatarUrl ? uploadAvatar(avatarUrl) : Promise.resolve('');
  return upload.then(function (avatar) {
    var saved = avatar || (persistableAvatar(avatarUrl) ? avatarUrl : '');
    if (avatarUrl && !saved) {
      return Promise.reject(new Error('头像上传失败，请重试'));
    }
    return api.post('/api/auth/agree', {
      nickname: name,
      avatar: saved
    });
  }).then(function (payload) {
    store.setSession(true);
    return biz.applyData(payload);
  });
}

function isAppLoggedIn(data) {
  var user = (data && data.user) || {};
  return !!user.authorized;
}

function logoutSession() {
  var user = getApp().getData().user || {};
  var demo = !user.id || user.id === 'U001';
  var title = '退出登录';
  var body = demo
    ? '将清除本地预约、订单和课包数据，且不可恢复。'
    : '退出后本机看不到你的预约和订单。用同一个微信再登录，数据还在。';
  return util.confirmDialog(title, body, '确认退出').then(function (ok) {
    if (!ok) return { cancelled: true };
    return api.post('/api/logout').then(function (payload) {
      store.setSession(false);
      store.clearCache();
      var app = getApp();
      app.applyServerData(payload);
      app.globalData.ui.pendingAuth = true;
      util.toast('已退出登录');
      return { cancelled: false, demo: demo };
    });
  });
}

module.exports = {
  DEFAULT_AVATAR: DEFAULT_AVATAR,
  persistableAvatar: persistableAvatar,
  uploadAvatar: uploadAvatar,
  cleanNickname: cleanNickname,
  isPlaceholderName: isPlaceholderName,
  realNickname: realNickname,
  displayName: displayName,
  submitProfile: submitProfile,
  isAppLoggedIn: isAppLoggedIn,
  logoutSession: logoutSession
};
