Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/home/home', text: '首页', icon: 'house' },
      { pagePath: '/pages/venues/venues', text: '甄选', icon: 'sparkles' },
      { pagePath: '/pages/schedule/schedule', text: '课表', icon: 'calendar-days' },
      { pagePath: '/pages/activities/activities', text: '活动', icon: 'party-popper' },
      { pagePath: '/pages/profile/profile', text: '我的', icon: 'user' }
    ]
  },
  methods: {
    onTap: function (e) {
      var idx = e.currentTarget.dataset.index;
      var item = this.data.list[idx];
      this.setData({ selected: idx });
      wx.switchTab({ url: item.pagePath });
    }
  }
});
