const OSS = 'https://mashangfei1112.oss-accelerate.aliyuncs.com/gym-demo/photos/';

function oss(name) {
  return OSS + name + '.jpg';
}

async function seed(conn) {
  await conn.execute(
    `INSERT INTO users (id, openid, nickname, avatar, phone, authorized, notify_enabled, current_city, current_store_id, seen_auth, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['U001', null, '', oss('avatar-user'), '', 0, 0, '北京', 'ST001', 0, null]
  );

  const stores = [
    ['ST001', '北京', '崇文门全能店', '1.2km', '07:00-22:00', '010-88886666', '东城区崇文门外大街 18 号', oss('store-chongwen'), [oss('store-chongwen'), oss('store-gallery-1'), oss('store-gallery-2')], ['全能店', '可停车']],
    ['ST002', '北京', '金宝汇店', '1.7km', '08:00-21:30', '010-88887777', '东城区金宝街 88 号', oss('store-jinbao'), [oss('store-jinbao'), oss('store-gallery-1')], ['私教店']],
    ['ST003', '上海', '静安寺店', '2.4km', '07:30-22:00', '021-66668888', '静安区南京西路 1601 号', oss('store-chongwen'), [oss('store-chongwen'), oss('class-hiit')], ['全能店']]
  ];
  for (const s of stores) {
    await conn.execute(
      `INSERT INTO stores (id, city, name, dist, hours, phone, address, cover, gallery, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON))`,
      [s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], JSON.stringify(s[8]), JSON.stringify(s[9])]
    );
  }

  const coaches = [
    ['T001', '张教练', oss('coach-zhang'), '国家一级健身教练', ['力量', '塑形'], 8, '擅长杠铃操与体态纠正，带过多届新人训练营。', 'ST001'],
    ['T002', '李教练', oss('coach-li'), '搏击专项教练', ['搏击', '燃脂'], 6, '节奏稳、保护意识强，适合想出汗又怕受伤的人。', 'ST001'],
    ['T003', '王教练', oss('coach-wang'), '瑜伽理疗教练', ['瑜伽', '拉伸'], 7, '动作拆解细致，办公室久坐人群友好。', 'ST002']
  ];
  for (const c of coaches) {
    await conn.execute(
      `INSERT INTO coaches (id, name, avatar, title, skills, years, intro, store_id)
       VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?)`,
      [c[0], c[1], c[2], c[3], JSON.stringify(c[4]), c[5], c[6], c[7]]
    );
  }

  const banners = [
    ['B1', oss('banner-1'), '燃脂季 · 新课上新', '限时新人特惠 ¥49 起', '/class?id=S001', oss('banner-2'), 1],
    ['B2', oss('banner-2'), '私教体验课', '1 节入门，教练一对一带练', '/package?id=P001', oss('banner-1'), 2],
    ['B3', oss('banner-3'), '万圣节主题夜训', '11月7日 · 崇文门店报名中', '/activity?id=A001', oss('banner-2'), 3]
  ];
  for (const b of banners) {
    await conn.execute(
      `INSERT INTO banners (id, image, title, sub, link, fb, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      b
    );
  }

  const sessions = [
    ['S001', 'C001', '塑形杠铃操', oss('class-barbell'), ['力量', '塑形', '新手友好'], 60, '中', '全身塑形入门', 'ST001', 'T001', -1, '19:00', '20:00', 49, 79, 16, 10, '2楼操房', '用轻中重量杠铃完成全身复合动作，课上有教练带节奏，新手也能跟上。'],
    ['S002', 'C002', '燃脂搏击', oss('class-boxing'), ['燃脂'], 60, '高', '有基础或想挑战的人', 'ST001', 'T002', 1, '20:10', '21:10', 59, 89, 12, 12, '3楼搏击房', '拳腿组合配合步伐，整节课保持中高强度，出汗明显。'],
    ['S003', 'C003', '活力瑜伽', oss('class-yoga'), ['拉伸', '放松'], 60, '低', '久坐人群', 'ST002', 'T003', 1, '18:30', '19:30', 59, 79, 18, 4, '瑜伽馆', '以流动体式打开胸椎与髋部，课后会有 8 分钟休息术。'],
    ['S004', 'C004', '燃脂 HIIT', oss('class-hiit'), ['燃脂', '心肺'], 45, '高', '想快速出汗', 'ST001', 'T002', 2, '12:20', '13:05', 45, 69, 14, 3, '1楼功能区', '20 秒练 10 秒歇的循环课，动作都有低冲击替代。'],
    ['S005', 'C001', '塑形杠铃操', oss('class-barbell'), ['力量', '塑形'], 60, '中', '全身塑形入门', 'ST002', 'T001', 3, '19:00', '20:00', 49, 79, 16, 7, '操房', '金宝汇店晚间场，内容和崇文门店同一套编排。'],
    ['S006', 'C003', '活力瑜伽', oss('class-yoga'), ['拉伸'], 60, '低', '全员', 'ST001', 'T003', 5, '10:00', '11:00', 49, 69, 16, 2, '瑜伽馆', '晨间阴瑜伽，适合恢复日。'],
    ['S007', 'C002', '燃脂搏击', oss('class-boxing'), ['燃脂'], 60, '高', '进阶', 'ST001', 'T002', 6, '19:30', '20:30', 59, 89, 12, 5, '搏击房', '周末进阶场，组合会稍快。'],
    ['S008', 'C004', '燃脂 HIIT', oss('class-hiit'), ['燃脂'], 45, '高', '全员', 'ST002', 'T002', 8, '18:00', '18:45', 45, 69, 12, 1, '功能区', '周日收尾课，带你把一周热量再推一把。']
  ];
  for (const s of sessions) {
    await conn.execute(
      `INSERT INTO sessions (
         id, course_id, name, cover, tags, duration_min, intensity, crowd, store_id, coach_id,
         date_offset, start_hm, end_hm, price, origin_price, capacity, booked, seed_booked, room, intro
       ) VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s[0], s[1], s[2], s[3], JSON.stringify(s[4]), s[5], s[6], s[7], s[8], s[9], s[10], s[11], s[12], s[13], s[14], s[15], s[16], s[16], s[17], s[18]]
    );
  }

  const packages = [
    ['P001', '私教体验课', 1, 199, 299, 30, '1 对 1 体验，了解动作与节奏。', oss('coach-zhang')],
    ['P002', '周期课包 10 节', 10, 1680, 1990, 90, '90 天有效，适合连续塑形。', oss('class-barbell')],
    ['P003', '精品小班课 8 节', 8, 1280, 1600, 60, '3-6 人小班，兼顾私教精度和团课氛围。', oss('class-hiit')]
  ];
  for (const p of packages) {
    await conn.execute(
      `INSERT INTO packages (id, name, sessions, price, origin_price, valid_days, description, cover)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      p
    );
  }

  await conn.execute(
    `INSERT INTO camps (
       id, name, tags, cover, start_offset, weeks, price, origin_price, capacity, booked, seed_booked,
       enroll_offset, coach_id, store_id, schedule, intro
     ) VALUES (?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)`,
    [
      'M001',
      '4 周燃脂训练营',
      JSON.stringify(['减脂', '小班']),
      oss('camp-fatloss'),
      8,
      4,
      899,
      1099,
      16,
      8,
      8,
      0,
      'T002',
      'ST001',
      JSON.stringify(['周一 / 三 / 五 19:30-20:30']),
      '四周主题：激活代谢、力量底座、有氧峰值、体态巩固。开营后不支持自行退款。'
    ]
  );
  await conn.execute(
    `INSERT INTO camps (
       id, name, tags, cover, start_offset, weeks, price, origin_price, capacity, booked, seed_booked,
       enroll_offset, coach_id, store_id, schedule, intro
     ) VALUES (?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)`,
    [
      'M002',
      '体态重塑营',
      JSON.stringify(['塑形', '体态']),
      oss('class-yoga'),
      15,
      6,
      1299,
      1499,
      12,
      2,
      2,
      0,
      'T001',
      'ST002',
      JSON.stringify(['周二 / 四 12:20-13:20']),
      '面向久坐体态，开营前开放报名。'
    ]
  );

  await conn.execute(
    `INSERT INTO venues (id, name, tags, cover, dist, price, origin_price, hours, intro, cancel_hours, address)
     VALUES (?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'V001',
      '柏悦酒店恒温泳池',
      JSON.stringify(['恒温泳池', '星级酒店']),
      oss('venue-pool'),
      '2.1km',
      159,
      220,
      '10:00-21:00',
      '合作酒店室内恒温泳池，含更衣室与浴巾。取消时限以本页为准：开场前 8 小时。',
      8,
      '朝阳区东三环北路 1 号'
    ]
  );
  await conn.execute(
    `INSERT INTO venues (id, name, tags, cover, dist, price, origin_price, hours, intro, cancel_hours, address)
     VALUES (?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'V002',
      '形馆普拉提',
      JSON.stringify(['大器械', '精品小班']),
      oss('venue-pilates'),
      '3.4km',
      199,
      268,
      '09:00-21:00',
      '改革器小班，每班不超过 6 人。开课前 6 小时可取消。',
      6,
      '朝阳区工体北路 8 号'
    ]
  );

  await conn.execute(
    `INSERT INTO activities (id, name, cover, act_date, act_time, store_id, status, paid, price, intro, booked, seed_booked, capacity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'A001',
      '万圣节主题夜训',
      oss('activity-halloween'),
      '2026-11-07',
      '19:30-21:00',
      'ST001',
      'open',
      1,
      39,
      '换装夜训 + 合影，名额 40 人。可在线支付报名。',
      18,
      18,
      40
    ]
  );
  await conn.execute(
    `INSERT INTO activities (id, name, cover, act_date, act_time, store_id, status, paid, price, intro, booked, seed_booked, capacity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'A002',
      '新店开业公开课',
      oss('activity-open'),
      '2026-10-18',
      '14:00-15:00',
      'ST002',
      'ended',
      0,
      0,
      '金宝汇店开业体验课，已结束。',
      30,
      30,
      30
    ]
  );

  await conn.execute(
    `INSERT INTO coupons (id, user_id, name, amount, min_amount, status, expire_offset) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['CP001', 'U001', '新人券', 10, 50, 'unused', 30]
  );
  await conn.execute(
    `INSERT INTO coupons (id, user_id, name, amount, min_amount, status, expire_offset) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['CP002', 'U001', '满减券', 20, 200, 'unused', 45]
  );

  await conn.execute(
    `INSERT INTO owned_packages (id, user_id, package_id, name, total, remain, expire_offset)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['OP001', 'U001', 'P002', '周期课包 10 节', 10, 3, 70]
  );
}

module.exports = { seed, oss, OSS };
