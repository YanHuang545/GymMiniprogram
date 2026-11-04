-- 微信登录：users.openid 唯一，不 DROP 表，U001 演示数据不动
ALTER TABLE users
  ADD COLUMN openid VARCHAR(64) NULL DEFAULT NULL AFTER id,
  ADD COLUMN last_login_at BIGINT NULL DEFAULT NULL;
ALTER TABLE users ADD UNIQUE KEY uk_openid (openid);
