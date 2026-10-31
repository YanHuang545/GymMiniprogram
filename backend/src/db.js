/**
 * MySQL 连接配置。
 *
 * 真机预约数据要进阿里云宝塔时，改 backend/.env，不要改这段默认值。
 *
 * 需要你提供（宝塔 → 数据库 → 添加数据库 gym_ranlian 之后那一行）：
 *   DB_HOST     轻量服务器公网 IP，例如 39.107.41.170
 *   DB_PORT     一般是 3306
 *   DB_USER     宝塔给这个库生成的用户名（不是面板登录账号）
 *   DB_PASSWORD 宝塔给这个库生成的密码（不是面板登录密码）
 *   DB_NAME     gym_ranlian
 *
 * 宝塔还要同时做两件事，否则本机 Express 连不上：
 *   1) 该库「访问权限」改为所有人，或填你电脑的公网 IP
 *   2) 宝塔「安全」和阿里云安全组放行 TCP 3306
 *
 * 程序和 MySQL 都在同一台服务器时，DB_HOST 改回 127.0.0.1。
 */
const mysql = require('mysql2/promise');

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function baseConfig(extra) {
  return Object.assign(
    {
      host: env('DB_HOST', '127.0.0.1'),
      port: Number(env('DB_PORT', 3306)),
      user: env('DB_USER', 'root'),
      password: env('DB_PASSWORD', 'ROOT'),
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    },
    extra || {}
  );
}

const pool = mysql.createPool(
  baseConfig({
    database: env('DB_NAME', 'gym_ranlian')
  })
);

async function createAdminConnection(extra) {
  const extraCfg = Object.assign({ multipleStatements: true }, extra || {});
  if (env('DB_CREATE', '1') === '0' && extraCfg.database === undefined) {
    extraCfg.database = env('DB_NAME', 'gym_ranlian');
  }
  return mysql.createConnection(baseConfig(extraCfg));
}

module.exports = {
  pool,
  baseConfig,
  createAdminConnection,
  dbName: env('DB_NAME', 'gym_ranlian')
};
