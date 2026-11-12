(function () {
  var BM = window.BM = window.BM || {};

  function SoundManager() {
    this.ctx = null;
    this.master = null;
    this.muted = BM.Storage.get('bm_muted', false);
    this.unlocked = false;
    this._noiseCache = {};
    this._bindUnlock();
  }

  SoundManager.prototype._bindUnlock = function () {
    var self = this;
    var unlock = function () {
      self.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: false });
  };

  SoundManager.prototype.unlock = function () {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      if (!this.ctx) {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.unlocked = true;
      return true;
    } catch (e) {
      this.ctx = null;
      return false;
    }
  };

  SoundManager.prototype.isMuted = function () {
    return !!this.muted;
  };

  SoundManager.prototype.setMuted = function (muted) {
    this.muted = !!muted;
    BM.Storage.set('bm_muted', this.muted);
    if (!this.muted && this.ctx && this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch (e) {}
    }
    if (this.master && this.ctx) {
      var t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, t, 0.02);
    }
  };

  SoundManager.prototype.toggle = function () {
    this.setMuted(!this.muted);
    return this.muted;
  };

  SoundManager.prototype._tone = function (freq, dur, type, vol, slideTo, delay) {
    if (!this.ctx || this.muted) return;
    try {
      var t0 = this.ctx.currentTime + (delay || 0);
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.12), t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    } catch (e) {}
  };

  SoundManager.prototype._noise = function (dur, vol, cutoff, delay) {
    if (!this.ctx || this.muted) return;
    try {
      var t0 = this.ctx.currentTime + (delay || 0);
      var key = dur + ':' + (cutoff || 1200);
      var buf = this._noiseCache[key];
      if (!buf) {
        var n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
        buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < n; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / n);
        }
        this._noiseCache[key] = buf;
      }
      var src = this.ctx.createBufferSource();
      src.buffer = buf;
      var filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff || 1200;
      var gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.14, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t0);
    } catch (e) {}
  };

  SoundManager.prototype.play = function (name) {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch (e) {}
    }
    switch (name) {
      case 'bomb':
        this._tone(150, 0.09, 'square', 0.12, 90);
        this._noise(0.06, 0.05, 700);
        break;
      case 'explode':
        this._noise(0.34, 0.22, 900);
        this._tone(90, 0.3, 'sawtooth', 0.14, 38);
        this._tone(220, 0.18, 'square', 0.06, 70, 0.02);
        break;
      case 'item':
        this._tone(660, 0.09, 'triangle', 0.1);
        this._tone(880, 0.09, 'triangle', 0.1, null, 0.08);
        this._tone(1180, 0.12, 'triangle', 0.1, null, 0.16);
        break;
      case 'hurt':
        this._tone(340, 0.28, 'sawtooth', 0.15, 70);
        this._noise(0.18, 0.1, 600);
        break;
      case 'respawn':
        this._tone(320, 0.12, 'triangle', 0.1, 460);
        this._tone(520, 0.16, 'triangle', 0.09, 780, 0.1);
        break;
      case 'win':
        this._tone(523, 0.14, 'square', 0.12);
        this._tone(659, 0.14, 'square', 0.12, null, 0.13);
        this._tone(784, 0.18, 'square', 0.12, null, 0.26);
        this._tone(1047, 0.32, 'square', 0.12, null, 0.42);
        break;
      case 'lose':
        this._tone(392, 0.2, 'sawtooth', 0.12, 330);
        this._tone(294, 0.2, 'sawtooth', 0.12, 240, 0.18);
        this._tone(196, 0.42, 'sawtooth', 0.14, 90, 0.36);
        break;
      case 'click':
        this._tone(620, 0.045, 'square', 0.06);
        break;
      case 'start':
        this._tone(392, 0.1, 'square', 0.1);
        this._tone(523, 0.1, 'square', 0.1, null, 0.1);
        this._tone(784, 0.16, 'square', 0.1, null, 0.2);
        break;
      case 'tick':
        this._tone(880, 0.05, 'square', 0.05);
        break;
      default:
        break;
    }
  };

  BM.SoundManager = SoundManager;
})();
