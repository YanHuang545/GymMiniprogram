// 模拟器始终走 http，保证开发者工具首页不依赖云。
// 真机/体验版：云函数转发；云未就绪再直连 https（会 -101）。
var cloudConfig = require('./cloud-config.js');
var HTTPS_PUBLIC = 'https://gymbackend.chuckrock.dpdns.org';
var HTTP_PUBLIC = 'http://gymbackend.chuckrock.dpdns.org';

function isDevtools() {
  try {
    return wx.getSystemInfoSync().platform === 'devtools';
  } catch (e) {
    return false;
  }
}

function getCloud() {
  try {
    var app = getApp();
    return (app && app.globalData && app.globalData.cloud) || wx.cloud;
  } catch (e) {
    return wx.cloud;
  }
}

function cloudReady() {
  try {
    var app = getApp();
    return !!(getCloud() && app && app.globalData && app.globalData.cloudReady);
  } catch (e) {
    return false;
  }
}

function rewritePublicUrls(value) {
  try {
    var raw = JSON.stringify(value);
    var prefix = cloudConfig.photoPrefix;
    if (prefix) {
      var dest = prefix.replace(/\/?$/, '/');
      raw = raw.split(HTTPS_PUBLIC + '/oss-photos/').join(dest);
      raw = raw.split(HTTP_PUBLIC + '/oss-photos/').join(dest);
    } else if (isDevtools()) {
      raw = raw.split(HTTPS_PUBLIC).join(HTTP_PUBLIC);
    }
    return JSON.parse(raw);
  } catch (e) {
    return value;
  }
}

function userId() {
  try {
    var app = getApp();
    return (app.globalData.data && app.globalData.data.user && app.globalData.data.user.id) || 'U001';
  } catch (e) {
    return 'U001';
  }
}

function parseBody(raw) {
  var body = raw;
  if (typeof raw === 'string') {
    try {
      body = JSON.parse(raw);
    } catch (e) {
      throw new Error('返回不是 JSON');
    }
  }
  if (!body || !body.ok) {
    var err = new Error((body && body.error) || '请求失败');
    err.statusCode = body && body.statusCode;
    throw err;
  }
  return rewritePublicUrls(body.data);
}

function requestCloud(method, path, data) {
  return new Promise(function (resolve, reject) {
    getCloud().callFunction({
      name: 'apiProxy',
      data: {
        method: method,
        path: path,
        data: data || {},
        userId: userId()
      },
      success: function (res) {
        try {
          resolve(parseBody(res.result));
        } catch (e) {
          reject(e);
        }
      },
      fail: function (e) {
        reject(new Error((e && e.errMsg) || '云函数调用失败'));
      }
    });
  });
}

function requestXhr(method, url, data) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: url,
      method: method,
      data: data || {},
      header: {
        'content-type': 'application/json',
        'X-User-Id': userId()
      },
      timeout: 60000,
      success: function (res) {
        try {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            var fail = (res.data && res.data.error) || '请求失败';
            var err = new Error(fail);
            err.statusCode = res.statusCode;
            reject(err);
            return;
          }
          resolve(parseBody(res.data));
        } catch (e) {
          reject(e);
        }
      },
      fail: function (e) {
        reject(new Error((e && e.errMsg) || '网络不可用，请确认后端已启动'));
      }
    });
  });
}

function applyPhotoPrefix(prefix) {
  if (!prefix) return;
  cloudConfig.photoPrefix = String(prefix).replace(/\/?$/, '/');
  try {
    wx.setStorageSync('photoCloudPrefix', cloudConfig.photoPrefix);
  } catch (e) {}
}

function ensurePhotos() {
  if (cloudConfig.photoPrefix) return Promise.resolve();
  try {
    var saved = wx.getStorageSync('photoCloudPrefix');
    if (saved) {
      applyPhotoPrefix(saved);
      return Promise.resolve();
    }
  } catch (e) {}
  return new Promise(function (resolve) {
    getCloud().callFunction({
      name: 'seedPhotos',
      success: function (res) {
        var prefix = res && res.result && res.result.photoPrefix;
        applyPhotoPrefix(prefix);
        resolve();
      },
      fail: function () {
        resolve();
      }
    });
  });
}

function request(method, path, data) {
  if (isDevtools()) {
    return requestXhr(method, HTTP_PUBLIC + path, data);
  }
  var app = null;
  try {
    app = getApp();
  } catch (e) {}
  var wait = app && app.prepareCloud ? app.prepareCloud() : Promise.resolve(false);
  return wait.then(function (ok) {
    if (!ok && !cloudReady()) {
      return Promise.reject(new Error('云开发未初始化'));
    }
    return ensurePhotos().then(function () {
      return requestCloud(method, path, data);
    });
  });
}

module.exports = {
  get: function (path, data) {
    return request('GET', path, data);
  },
  post: function (path, data) {
    return request('POST', path, data);
  }
};
