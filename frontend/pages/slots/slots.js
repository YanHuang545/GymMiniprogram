var store = require('../../utils/store.js');
var util = require('../../utils/util.js');
var biz = require('../../utils/biz.js');
var nav = require('../../utils/nav.js');
var pull = require('../../utils/refresh.js');

Page({
  data: {
    navBarHeight: 64,
    missing: false,
    c: {},
    dates: [],
    slotDate: '',
    slots: [],
    remainText: '',
    selectedSlot: ''
  },
  onLoad: function (q) {
    this.setData(getApp().layout());
    this.id = q.id;
  },
  onShow: function () {
    var ui = getApp().globalData.ui;
    var d = getApp().getData();
    var c = store.findById(d.coaches, this.id) || store.findById(d.coaches, ui.currentCoach);
    if (!c) { this.setData({ missing: true }); return; }
    ui.currentCoach = c.id;
    if (!ui.slotDate) ui.slotDate = util.ymd(util.today());
    this.build(c);
  },
  onPullDownRefresh: pull.onPullDownRefresh,
  refresh: function () {
    this.onShow();
  },
  build: function (c) {
    var ui = getApp().globalData.ui;
    var d = getApp().getData();
    var dates = [];
    for (var i = 0; i < 7; i++) {
      var day = util.addDays(util.today(), i);
      var key = util.ymd(day);
      dates.push({ key: key, num: i === 0 ? '今' : day.getDate(), lab: util.weekLabel(day).slice(1) });
    }
    var hours = ['10:00', '11:00', '14:00', '15:00', '16:00', '19:00'];
    var taken = {};
    (d.bookings || []).forEach(function (b) {
      if (b.kind === 'private' && b.status === 'upcoming' && b.coachId === c.id && b.date === ui.slotDate) taken[b.start] = 1;
    });
    if (ui.slotDate === util.ymd(util.today())) {
      taken['10:00'] = 1;
      taken['16:00'] = 1;
    }
    var slots = hours.map(function (h) {
      var busy = !!taken[h];
      return { id: h, busy: busy, on: ui.selectedSlot === h && !busy };
    });
    this.setData({
      missing: false,
      c: c,
      dates: dates,
      slotDate: ui.slotDate,
      slots: slots,
      selectedSlot: ui.selectedSlot,
      remainText: '课包剩余 ' + store.remainingPkg(d) + ' 次，本次扣 1 次'
    });
  },
  onDate: function (e) {
    var ui = getApp().globalData.ui;
    ui.slotDate = e.currentTarget.dataset.id;
    ui.selectedSlot = '';
    this.build(this.data.c);
  },
  pickSlot: function (e) {
    var id = e.currentTarget.dataset.id;
    var slot = (this.data.slots || []).find(function (s) { return s.id === id; });
    if (slot && slot.busy) return util.toast('这个时间刚被约走，换一个吧');
    getApp().globalData.ui.selectedSlot = id;
    this.build(this.data.c);
  },
  confirm: function () {
    var ui = getApp().globalData.ui;
    if (!ui.selectedSlot) return util.toast('请选择时段');
    var d = getApp().getData();
    var c = this.data.c;
    var start = ui.selectedSlot;
    var endH = util.pad(util.num(start.split(':')[0]) + 1) + ':00';
    if (store.conflictBooking(d, ui.slotDate, start, endH)) return util.toast('这个时间你已经有课了');
    var payload = {
      coachId: c.id,
      date: ui.slotDate,
      start: start,
      rescheduleId: ui.rescheduleId || ''
    };
    biz.confirmSlot(payload).then(function (result) {
      if (result && result.type === 'reschedule') {
        ui.rescheduleId = '';
        util.toast('改约成功');
        nav.go('/booking?id=' + result.booking.id, { replace: true });
        return;
      }
      util.toast('预约成功，已扣 1 次');
      nav.go('/result?id=' + result.order.id);
    }).catch(biz.failToast);
  }
});
