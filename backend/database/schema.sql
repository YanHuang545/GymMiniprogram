SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS enterprise_leads;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS owned_packages;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS venues;
DROP TABLE IF EXISTS camps;
DROP TABLE IF EXISTS packages;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS banners;
DROP TABLE IF EXISTS coaches;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id VARCHAR(32) NOT NULL,
  nickname VARCHAR(64) NOT NULL DEFAULT '',
  avatar VARCHAR(512) NOT NULL DEFAULT '',
  phone VARCHAR(32) NOT NULL DEFAULT '',
  authorized TINYINT(1) NOT NULL DEFAULT 0,
  notify_enabled TINYINT(1) NOT NULL DEFAULT 0,
  current_city VARCHAR(32) NOT NULL DEFAULT '北京',
  current_store_id VARCHAR(32) NOT NULL DEFAULT 'ST001',
  seen_auth TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stores (
  id VARCHAR(32) NOT NULL,
  city VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  dist VARCHAR(32) NOT NULL DEFAULT '',
  hours VARCHAR(32) NOT NULL DEFAULT '',
  phone VARCHAR(32) NOT NULL DEFAULT '',
  address VARCHAR(255) NOT NULL DEFAULT '',
  cover VARCHAR(512) NOT NULL DEFAULT '',
  gallery JSON NULL,
  tags JSON NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE coaches (
  id VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  avatar VARCHAR(512) NOT NULL DEFAULT '',
  title VARCHAR(128) NOT NULL DEFAULT '',
  skills JSON NULL,
  years INT NOT NULL DEFAULT 0,
  intro TEXT,
  store_id VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_store (store_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE banners (
  id VARCHAR(32) NOT NULL,
  image VARCHAR(512) NOT NULL DEFAULT '',
  title VARCHAR(128) NOT NULL DEFAULT '',
  sub VARCHAR(255) NOT NULL DEFAULT '',
  link VARCHAR(255) NOT NULL DEFAULT '',
  fb VARCHAR(512) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessions (
  id VARCHAR(32) NOT NULL,
  course_id VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  cover VARCHAR(512) NOT NULL DEFAULT '',
  tags JSON NULL,
  duration_min INT NOT NULL DEFAULT 60,
  intensity VARCHAR(16) NOT NULL DEFAULT '中',
  crowd VARCHAR(64) NOT NULL DEFAULT '',
  store_id VARCHAR(32) NOT NULL,
  coach_id VARCHAR(32) NOT NULL,
  date_offset INT NOT NULL DEFAULT 0,
  start_hm CHAR(5) NOT NULL,
  end_hm CHAR(5) NOT NULL,
  price INT NOT NULL DEFAULT 0,
  origin_price INT NOT NULL DEFAULT 0,
  capacity INT NOT NULL DEFAULT 0,
  booked INT NOT NULL DEFAULT 0,
  seed_booked INT NOT NULL DEFAULT 0,
  room VARCHAR(64) NOT NULL DEFAULT '',
  intro TEXT,
  PRIMARY KEY (id),
  KEY idx_store_date (store_id, date_offset)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE packages (
  id VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  sessions INT NOT NULL DEFAULT 1,
  price INT NOT NULL DEFAULT 0,
  origin_price INT NOT NULL DEFAULT 0,
  valid_days INT NOT NULL DEFAULT 30,
  description VARCHAR(255) NOT NULL DEFAULT '',
  cover VARCHAR(512) NOT NULL DEFAULT '',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE camps (
  id VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  tags JSON NULL,
  cover VARCHAR(512) NOT NULL DEFAULT '',
  start_offset INT NOT NULL DEFAULT 0,
  weeks INT NOT NULL DEFAULT 4,
  price INT NOT NULL DEFAULT 0,
  origin_price INT NOT NULL DEFAULT 0,
  capacity INT NOT NULL DEFAULT 0,
  booked INT NOT NULL DEFAULT 0,
  seed_booked INT NOT NULL DEFAULT 0,
  enroll_offset INT NOT NULL DEFAULT 0,
  coach_id VARCHAR(32) NOT NULL,
  store_id VARCHAR(32) NOT NULL,
  schedule JSON NULL,
  intro TEXT,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE venues (
  id VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  tags JSON NULL,
  cover VARCHAR(512) NOT NULL DEFAULT '',
  dist VARCHAR(32) NOT NULL DEFAULT '',
  price INT NOT NULL DEFAULT 0,
  origin_price INT NOT NULL DEFAULT 0,
  hours VARCHAR(32) NOT NULL DEFAULT '',
  intro TEXT,
  cancel_hours INT NOT NULL DEFAULT 6,
  address VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activities (
  id VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  cover VARCHAR(512) NOT NULL DEFAULT '',
  act_date CHAR(10) NOT NULL,
  act_time VARCHAR(32) NOT NULL DEFAULT '',
  store_id VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  paid TINYINT(1) NOT NULL DEFAULT 1,
  price INT NOT NULL DEFAULT 0,
  intro TEXT,
  booked INT NOT NULL DEFAULT 0,
  seed_booked INT NOT NULL DEFAULT 0,
  capacity INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE coupons (
  id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  min_amount INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'unused',
  expire_offset INT NOT NULL DEFAULT 30,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE owned_packages (
  id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  package_id VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  total INT NOT NULL DEFAULT 0,
  remain INT NOT NULL DEFAULT 0,
  expire_offset INT NOT NULL DEFAULT 70,
  expire_date CHAR(10) NULL,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending_payment',
  created_at BIGINT NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  refund_amount INT NOT NULL DEFAULT 0,
  title VARCHAR(128) NOT NULL DEFAULT '',
  when_text VARCHAR(128) NOT NULL DEFAULT '',
  place VARCHAR(128) NOT NULL DEFAULT '',
  kind VARCHAR(16) NOT NULL DEFAULT 'group',
  session_id VARCHAR(32) NULL,
  package_id VARCHAR(32) NULL,
  camp_id VARCHAR(32) NULL,
  venue_id VARCHAR(32) NULL,
  activity_id VARCHAR(32) NULL,
  coach_id VARCHAR(32) NULL,
  act_date CHAR(10) NULL,
  start_hm CHAR(5) NULL,
  end_hm CHAR(5) NULL,
  store_id VARCHAR(32) NULL,
  cover VARCHAR(512) NULL,
  duration_min INT NOT NULL DEFAULT 60,
  coupon_id VARCHAR(32) NULL,
  cancel_hours INT NOT NULL DEFAULT 6,
  PRIMARY KEY (id),
  KEY idx_user_status (user_id, status),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bookings (
  id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'upcoming',
  created_at BIGINT NOT NULL,
  duration_min INT NOT NULL DEFAULT 60,
  order_id VARCHAR(32) NULL,
  kind VARCHAR(16) NOT NULL DEFAULT 'group',
  title VARCHAR(128) NOT NULL DEFAULT '',
  act_date CHAR(10) NULL,
  start_hm CHAR(5) NULL,
  end_hm CHAR(5) NULL,
  store_id VARCHAR(32) NULL,
  session_id VARCHAR(32) NULL,
  venue_id VARCHAR(32) NULL,
  camp_id VARCHAR(32) NULL,
  activity_id VARCHAR(32) NULL,
  coach_id VARCHAR(32) NULL,
  cover VARCHAR(512) NULL,
  cancel_hours INT NOT NULL DEFAULT 6,
  PRIMARY KEY (id),
  KEY idx_user_status (user_id, status),
  KEY idx_session (session_id),
  KEY idx_coach_date (coach_id, act_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  order_id VARCHAR(32) NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  paid_at BIGINT NOT NULL,
  channel VARCHAR(32) NOT NULL DEFAULT 'wechat_mock',
  PRIMARY KEY (id),
  KEY idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE enterprise_leads (
  id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  company VARCHAR(128) NOT NULL,
  contact_name VARCHAR(64) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  need_text TEXT,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE favorites (
  id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  target_id VARCHAR(32) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
