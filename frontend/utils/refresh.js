var util = require('./util.js');

function paint(page) {
  if (!page) return;
  if (typeof page.refresh === 'function') page.refresh();
}

function fromServer(page, opts) {
  opts = opts || {};
  if (opts.busy) util.showBusy(opts.title || '刷新中');
  return getApp()
    .sync()
    .then(function (data) {
      paint(page);
      if (opts.busy) util.hideBusy();
      if (opts.fromPull) {
        try {
          wx.stopPullDownRefresh();
        } catch (e) {}
      }
      return data;
    });
}

function onPullDownRefresh() {
  fromServer(this, { fromPull: true, busy: true, title: '刷新中' });
}

module.exports = {
  fromServer: fromServer,
  onPullDownRefresh: onPullDownRefresh
};
