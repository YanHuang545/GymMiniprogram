require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../database/migrations/20261104-wechat-openid.sql'),
    'utf8'
  );
  const parts = sql
    .split(';')
    .map(function (s) {
      return s.replace(/--[^\n]*/g, '').trim();
    })
    .filter(Boolean);
  for (const stmt of parts) {
    try {
      await pool.query(stmt);
      console.log('ok', stmt.slice(0, 60).replace(/\s+/g, ' '));
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
        console.log('skip', err.code, stmt.slice(0, 40));
        continue;
      }
      throw err;
    }
  }
  const [cols] = await pool.query("SHOW COLUMNS FROM users LIKE 'openid'");
  console.log('openid column', cols[0] && cols[0].Field);
}

run()
  .catch(function (err) {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(function () {
    return pool.end();
  });
