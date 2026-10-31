Component({
  options: {
    virtualHost: true
  },
  properties: {
    title: {
      type: String,
      value: ''
    },
    showBack: {
      type: Boolean,
      value: true
    },
    background: {
      type: String,
      value: '#241812'
    }
  },
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    capsulePad: 96
  },
  attached: function () {
    var app = getApp();
    this.setData(app.layout());
  },
  methods: {
    onBack: function () {
      getApp().back('/home');
    }
  }
});
