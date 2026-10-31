UPDATE sessions SET date_offset = -1 WHERE id = 'S001';
UPDATE sessions SET date_offset = 1 WHERE id IN ('S002', 'S003');
UPDATE sessions SET date_offset = 2 WHERE id = 'S004';
UPDATE sessions SET date_offset = 3 WHERE id = 'S005';
UPDATE sessions SET date_offset = 5 WHERE id = 'S006';
UPDATE sessions SET date_offset = 6 WHERE id = 'S007';
UPDATE sessions SET date_offset = 8 WHERE id = 'S008';

UPDATE camps SET start_offset = 8, enroll_offset = 0 WHERE id = 'M001';
UPDATE camps SET start_offset = 15, enroll_offset = 0 WHERE id = 'M002';

UPDATE activities SET act_date = '2026-11-07' WHERE id = 'A001';
UPDATE banners SET sub = '11月7日 · 崇文门店报名中' WHERE id = 'B3';
