const cloud = require('wx-server-sdk');
const http = require('http');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

var UPSTREAM = 'http://gymbackend.chuckrock.dpdns.org/oss-photos/';
var FILES = [
  'activity-halloween.jpg',
  'activity-open.jpg',
  'avatar-user.jpg',
  'banner-1.jpg',
  'banner-2.jpg',
  'banner-3.jpg',
  'camp-fatloss.jpg',
  'class-barbell.jpg',
  'class-boxing.jpg',
  'class-hiit.jpg',
  'class-yoga.jpg',
  'coach-li.jpg',
  'coach-wang.jpg',
  'coach-zhang.jpg',
  'store-chongwen.jpg',
  'store-gallery-1.jpg',
  'store-gallery-2.jpg',
  'store-jinbao.jpg',
  'venue-pilates.jpg',
  'venue-pool.jpg'
];

function download(url) {
  return new Promise(function (resolve, reject) {
    http
      .get(url, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          download(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error('download ' + res.statusCode + ' ' + url));
          return;
        }
        var chunks = [];
        res.on('data', function (c) {
          chunks.push(c);
        });
        res.on('end', function () {
          resolve(Buffer.concat(chunks));
        });
      })
      .on('error', reject);
  });
}

async function readPrefix() {
  try {
    var doc = await cloud.database().collection('app_meta').doc('photos').get();
    return (doc && doc.data && doc.data.photoPrefix) || '';
  } catch (e) {
    return '';
  }
}

async function savePrefix(prefix) {
  if (!prefix) return;
  try {
    await cloud.database().collection('app_meta').doc('photos').set({
      data: { photoPrefix: prefix, at: Date.now() }
    });
  } catch (e) {}
}

exports.main = async function () {
  var cached = await readPrefix();
  if (cached) {
    return { ok: true, count: 0, photoPrefix: cached, skipped: true, uploaded: [], failed: [] };
  }

  var uploaded = [];
  var failed = [];
  for (var i = 0; i < FILES.length; i++) {
    var name = FILES[i];
    try {
      var buf = await download(UPSTREAM + name);
      var res = await cloud.uploadFile({
        cloudPath: 'oss-photos/' + name,
        fileContent: buf
      });
      uploaded.push({ name: name, fileID: res.fileID });
    } catch (err) {
      failed.push({ name: name, error: (err && err.message) || String(err) });
    }
  }
  var prefix = '';
  if (uploaded[0] && uploaded[0].fileID) {
    prefix = uploaded[0].fileID.replace(/[^/]+$/, '');
  }
  await savePrefix(prefix);
  return {
    ok: failed.length === 0,
    count: uploaded.length,
    photoPrefix: prefix,
    uploaded: uploaded,
    failed: failed
  };
};
