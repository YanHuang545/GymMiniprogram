function uid(prefix) {
  return String(prefix || '') + Date.now().toString(36) + Math.floor(Math.random() * 1000);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function ymd(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function offsetDate(offset) {
  return ymd(addDays(today(), Number(offset) || 0));
}

function isPastStart(date, start) {
  if (!date || !start) return false;
  const now = new Date();
  const todayStr = ymd(now);
  const day = String(date);
  if (day < todayStr) return true;
  if (day > todayStr) return false;
  return String(start) <= pad(now.getHours()) + ':' + pad(now.getMinutes());
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
  asArr,
  bool,
  AppError,
  asyncHandler
};
