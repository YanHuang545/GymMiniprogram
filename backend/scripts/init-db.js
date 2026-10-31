/**
 * 创建/重建 gym_ranlian 表并写入种子。
 * 本地：node scripts/init-db.js
 * 宝塔已建好空库、当前账号没有 CREATE DATABASE 权限时：
 *   DB_CREATE=0 node scripts/init-db.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { createAdminConnection, dbName } = require('../src/db');
const { seed } = require('../src/seed');

async function run() {
  const canCreate = process.env.DB_CREATE !== '0';
  let conn;
  try {
    conn = await createAdminConnection();
    if (canCreate) {
      await conn.query(
        'CREATE DATABASE IF NOT EXISTS `' +
          dbName +
          '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
      );
      await conn.query('USE `' + dbName + '`');
    }
    const sql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    await conn.query(sql);
    await seed(conn);
    console.log('数据库初始化完成: ' + dbName + ' @ ' + (process.env.DB_HOST || '127.0.0.1'));
  } catch (err) {
    console.error('数据库初始化失败:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

run();
