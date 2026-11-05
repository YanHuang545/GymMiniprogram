process.env.TZ = 'Asia/Shanghai';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const https = require('https');
const express = require('express');
const cors = require('cors');
const { pool } = require('./db');
const { createRouter } = require('./routes');

const OSS_PHOTO =
  'https://mashangfei1112.oss-accelerate.aliyuncs.com/gym-demo/photos/';
const PHOTO_DIR = path.join(__dirname, '../public/oss-photos');
const PHOTO_NAME = /^[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/i;

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: process.env.DB_NAME || 'gym_ranlian' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use(
  '/oss-photos',
  express.static(PHOTO_DIR, {
    index: false,
    fallthrough: true,
    maxAge: '1d'
  })
);

app.get('/oss-photos/:file', function (req, res) {
  var file = req.params.file || '';
  if (!PHOTO_NAME.test(file)) {
    res.status(400).json({ ok: false, error: 'bad file' });
    return;
  }
  https
    .get(OSS_PHOTO + file, function (up) {
      res.status(up.statusCode || 502);
      if (up.headers['content-type']) {
        res.setHeader('content-type', up.headers['content-type']);
      }
      res.setHeader('cache-control', 'public, max-age=86400');
      up.pipe(res);
    })
    .on('error', function () {
      res.status(502).json({ ok: false, error: 'oss proxy failed' });
    });
});

app.use('/api', createRouter(pool));

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: `Route ${req.method} ${req.url} not found`
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : err.message || 'Internal Server Error';
  res.status(statusCode).json({
    ok: false,
    error: message
  });
});

process.on('uncaughtException', function (err) {
  console.error('uncaughtException', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', function (err) {
  console.error('unhandledRejection', err && err.stack ? err.stack : err);
});

const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => {
  console.log('燃练 API listening on http://127.0.0.1:' + port);
  console.log('真机请访问 http://192.168.3.98:' + port);
  console.log(
    'MySQL ' +
      (process.env.DB_USER || 'root') +
      '@' +
      (process.env.DB_HOST || '127.0.0.1') +
      '/' +
      (process.env.DB_NAME || 'gym_ranlian')
  );
});
