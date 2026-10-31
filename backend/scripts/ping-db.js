/**
 * 测试当前 .env 能否连上 MySQL，并列出 gym_ranlian 的表。
 * 执行：node scripts/ping-db.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool, dbName } = require('../src/db');

async function run() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const user = process.env.DB_USER || 'root';
  console.log('connecting', { host, user, database: dbName });
  try {
    const [ver] = await pool.query('SELECT VERSION() AS v, DATABASE() AS db');
    const [tables] = await pool.query('SHOW TABLES');
    const [stores] = await pool.query('SELECT id, name FROM stores');
    console.log('ok', ver[0]);
    console.log('tables', tables.length);
    console.log('stores', stores);
  } catch (err) {
    console.error('连接失败:', err.message);
    console.error('请核对 .env 的 DB_HOST/DB_USER/DB_PASSWORD/DB_NAME，以及宝塔是否放行 3306。');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
