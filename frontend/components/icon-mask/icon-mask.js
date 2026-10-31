var icons = require('../../utils/icons.js');

Component({
  options: {
    virtualHost: true
  },
  properties: {
    name: {
      type: String,
      value: 'sparkles'
    },
    color: {
      type: String,
      value: ''
    },
    size: {
      type: Number,
      value: 22
    }
  },
  data: {
    src: ''
  },
  observers: {
    name: function (name) {
      this.setData({ src: icons.getIcon(name) });
    }
  },
  attached: function () {
    this.setData({ src: icons.getIcon(this.data.name) });
  }
});
