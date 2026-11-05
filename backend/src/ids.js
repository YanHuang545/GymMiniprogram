function uid(prefix) {
  return String(prefix || '') + Date.now().toString(36) + Math.floor(Math.random() * 1000);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function ymd(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function shanghaiParts(d) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(d || new Date());
  function get(type) {
    const p = parts.find(function (x) {
      return x.type === type;
    });
    return p ? p.value : '';
  }
  return {
    date: get('year') + '-' + get('month') + '-' + get('day'),
    hm: get('hour') + ':' + get('minute')
  };
}

function today() {
  const bits = shanghaiParts().date.split('-').map(Number);
  return new Date(bits[0], bits[1] - 1, bits[2]);
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function offsetDate(offset) {
  return ymd(addDays(today(), Number(offset) || 0));
}

function isPastStart(date, start) {
  if (!date || !start) return false;
  const now = shanghaiParts();
  const day = String(date);
  if (day < now.date) return true;
  if (day > now.date) return false;
  return String(start) <= now.hm;
}

function shanghaiMillis(date, hm) {
  if (!date) return 0;
  const bits = String(hm || '00:00').split(':');
  return new Date(
    String(date) + 'T' + pad(Number(bits[0]) || 0) + ':' + pad(Number(bits[1]) || 0) + ':00+08:00'
  ).getTime();
}

function asArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

function bool(v) {
  return v === true || v === 1 || v === '1';
}

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 400;
    this.isOperational = true;
  }
}

function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  uid,
  pad,
  ymd,
  today,
  addDays,
  offsetDate,
  isPastStart,
  shanghaiParts,
  shanghaiMillis,
  asArr,
  bool,
  AppError,
  asyncHandler
};
