(function () {
  var BM = window.BM = window.BM || {};

  BM.clamp = function (v, min, max) {
    return v < min ? min : v > max ? max : v;
  };

  BM.rand = function (min, max) {
    return min + Math.random() * (max - min);
  };

  BM.randInt = function (min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  };

  BM.choice = function (arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  BM.key = function (x, y) {
    return x + ',' + y;
  };

  BM.DIRS = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];

  BM.DIR_VEC = {
    up: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }
  };

  BM.Storage = {
    get: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    }
  };

  function GameLoop(step) {
    this.step = step;
    this.running = false;
    this.raf = 0;
    this.last = 0;
    this._tick = this._tick.bind(this);
  }

  GameLoop.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    this.raf = window.requestAnimationFrame(this._tick);
  };

  GameLoop.prototype.stop = function () {
    this.running = false;
    if (this.raf) window.cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  GameLoop.prototype._tick = function (timestamp) {
    if (!this.running) return;
    var now = timestamp / 1000;
    var dt = this.last ? now - this.last : 0;
    this.last = now;
    if (dt > BM.CONFIG.DELTA_MAX) dt = BM.CONFIG.DELTA_MAX;
    if (dt < 0) dt = 0;
    this.step(dt, now);
    this.raf = window.requestAnimationFrame(this._tick);
  };

  BM.GameLoop = GameLoop;

  var KEY_DIR = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', a: 'left', s: 'down', d: 'right',
    W: 'up', A: 'left', S: 'down', D: 'right'
  };

  var BOMB_KEYS = { ' ': true, Spacebar: true, z: true, Z: true, j: true, J: true };
  var PAUSE_KEYS = { p: true, P: true, Escape: true };
  var MUTE_KEYS = { m: true, M: true };

  function InputHandler(options) {
    options = options || {};
    this.onPause = options.onPause || function () {};
    this.onMute = options.onMute || function () {};

    this.keyDirs = {};
    this.padDirs = {};
    this.dirPressAt = {};
    this.lastDir = null;
    this.lastDirAt = 0;
    this.bombQueued = false;
    this.attached = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
  }

  InputHandler.prototype.attach = function () {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup', this._onKeyUp, { passive: false });
    window.addEventListener('blur', this._onBlur);
  };

  InputHandler.prototype.detach = function () {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  };

  InputHandler.prototype._onKeyDown = function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var key = event.key;
    var dir = KEY_DIR[key];

    if (dir) {
      event.preventDefault();
      if (!this.keyDirs[dir]) {
        this.keyDirs[dir] = true;
        this.dirPressAt[dir] = Date.now();
        this.lastDir = dir;
        this.lastDirAt = this.dirPressAt[dir];
      }
      return;
    }

    if (BOMB_KEYS[key]) {
      event.preventDefault();
      if (!event.repeat) this.bombQueued = true;
      return;
    }

    if (PAUSE_KEYS[key]) {
      event.preventDefault();
      if (!event.repeat) this.onPause();
      return;
    }

    if (MUTE_KEYS[key]) {
      event.preventDefault();
      if (!event.repeat) this.onMute();
    }
  };

  InputHandler.prototype._onKeyUp = function (event) {
    var dir = KEY_DIR[event.key];
    if (!dir) return;
    event.preventDefault();
    this.keyDirs[dir] = false;
    if (this.lastDir === dir) {
      var held = Date.now() - (this.dirPressAt[dir] || 0);
      if (held > 160) {
        this.lastDir = null;
        this.lastDirAt = 0;
      }
    }
  };

  InputHandler.prototype._onBlur = function () {
    this.clear();
  };

  InputHandler.prototype.setPad = function (dir, pressed) {
    if (!BM.DIR_VEC[dir]) return;
    this.padDirs[dir] = !!pressed;
    if (pressed) {
      this.dirPressAt[dir] = Date.now();
      this.lastDir = dir;
      this.lastDirAt = this.dirPressAt[dir];
    } else if (this.lastDir === dir) {
      var held = Date.now() - (this.dirPressAt[dir] || 0);
      if (held > 160) {
        this.lastDir = null;
        this.lastDirAt = 0;
      }
    }
  };

  InputHandler.prototype.pressBomb = function () {
    this.bombQueued = true;
  };

  InputHandler.prototype.takeBomb = function () {
    var value = this.bombQueued;
    this.bombQueued = false;
    return value;
  };

  InputHandler.prototype.clear = function () {
    this.keyDirs = {};
    this.padDirs = {};
    this.dirPressAt = {};
    this.lastDir = null;
    this.lastDirAt = 0;
    this.bombQueued = false;
  };

  InputHandler.prototype.consumeTap = function () {
    if (this.lastDir && !this.keyDirs[this.lastDir] && !this.padDirs[this.lastDir]) {
      this.lastDir = null;
      this.lastDirAt = 0;
    }
  };

  InputHandler.prototype.getDirection = function () {
    var self = this;

    function active(name) {
      return !!self.keyDirs[name] || !!self.padDirs[name];
    }

    var dir = this.lastDir;
    if (!dir || !active(dir)) {
      dir = null;
      var names = ['up', 'right', 'down', 'left'];
      for (var i = 0; i < names.length; i++) {
        if (active(names[i])) {
          dir = names[i];
          break;
        }
      }
    }

    return dir ? BM.DIR_VEC[dir] : { x: 0, y: 0 };
  };

  InputHandler.prototype.getTapDirection = function () {
    var dir = this.lastDir;
    if (!dir) return { x: 0, y: 0 };
    var active = !!this.keyDirs[dir] || !!this.padDirs[dir];
    if (active) return { x: 0, y: 0 };
    if (Date.now() - this.lastDirAt > 160) return { x: 0, y: 0 };
    return BM.DIR_VEC[dir];
  };

  BM.InputHandler = InputHandler;
})();
