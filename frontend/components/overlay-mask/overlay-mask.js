Component({
  options: { virtualHost: true },
  properties: {
    show: { type: Boolean, value: false },
    center: { type: Boolean, value: false }
  },
  methods: {
    onMask: function () {
      this.triggerEvent('close');
    },
    noop: function () {}
  }
});
