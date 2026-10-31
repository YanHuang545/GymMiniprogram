const http = require('http');
const https = require('https');
const { URL } = require('url');

var HOST = 'gymbackend.chuckrock.dpdns.org';

function queryString(data) {
  if (!data) return '';
  var parts = [];
  Object.keys(data).forEach(function (key) {
    var val = data[key];
    if (val === undefined || val === null || val === '') return;
    parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
  });
  return parts.join('&');
}

function requestOnce(lib, url, method, body, userId, extra) {
  return new Promise(function (resolve, reject) {
    var u = new URL(url);
    var opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: method,
      headers: {
        'content-type': 'application/json',
        'X-User-Id': userId || 'U001',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 20000
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        opts[k] = extra[k];
      });
    }
    var req = lib.request(opts, function (res) {
      var chunks = [];
      res.on('data', function (c) {
        chunks.push(c);
      });
      res.on('end', function () {
        resolve({
          statusCode: res.statusCode,
          raw: Buffer.concat(chunks).toString('utf8')
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', function () {
      req.destroy(new Error('upstream timeout'));
    });
    if (body) req.write(body);
    req.end();
  });
}

function requestUpstream(method, path, data, userId) {
  var qs = method === 'GET' ? queryString(data) : '';
  var suffix = path + (qs ? (path.indexOf('?') >= 0 ? '&' : '?') + qs : '');
  var body = '';
  if (method !== 'GET' && data && Object.keys(data).length) {
    body = JSON.stringify(data);
  }

  return requestOnce(http, 'http://' + HOST + suffix, method, body, userId).catch(function (err) {
    if (!err || String(err.message || err).indexOf('ECONNRESET') < 0) {
      return requestOnce(
        https,
        'https://' + HOST + suffix,
        method,
        body,
        userId,
        { minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3' }
      );
    }
    return requestOnce(
      https,
      'https://' + HOST + suffix,
      method,
      body,
      userId,
      { minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3' }
    );
  });
}

exports.main = async function (event) {
  var method = String((event && event.method) || 'GET').toUpperCase();
  var path = (event && event.path) || '/api/bootstrap';
  var data = (event && event.data) || {};
  var userId = (event && event.userId) || 'U001';

  if (path.charAt(0) !== '/') path = '/' + path;

  try {
    var res = await requestUpstream(method, path, data, userId);
    var parsed = null;
    try {
      parsed = JSON.parse(res.raw);
    } catch (e) {
      return {
        ok: false,
        statusCode: res.statusCode,
        error: '上游返回不是 JSON'
      };
    }
    if (typeof parsed === 'object' && parsed) {
      parsed.statusCode = res.statusCode;
      return parsed;
    }
    return { ok: false, statusCode: res.statusCode, error: '上游返回无效' };
  } catch (err) {
    return {
      ok: false,
      error: (err && err.message) || '云函数转发失败'
    };
  }
};
