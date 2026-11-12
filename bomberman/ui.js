(function () {
  var BM = window.BM = window.BM || {};

  function $(id) {
    return document.getElementById(id);
  }

  function UI(game) {
    this.game = game;
    this.el = {
      time: $('hudTime'),
      lives: $('hudLives'),
      cpu: $('hudCpu'),
      range: $('hudRange'),
      bombs: $('hudBombs'),
      speed: $('hudSpeed'),
      mute: $('btnMute'),
      pause: $('btnPause'),
      home: $('btnHome'),
      overlay: $('overlay'),
      ovTitle: $('ovTitle'),
      ovBody: $('ovBody'),
      ovPrimary: $('ovPrimary'),
      ovSecondary: $('ovSecondary'),
      pad: $('pad'),
      bomb: $('btnBomb'),
      toast: $('toast'),
      diff: $('ovDiff'),
      diffHint: $('ovDiffHint'),
      diffButtons: Array.prototype.slice.call(document.querySelectorAll('.diff-btn'))
    };
    this._primary = null;
    this._difficulty = null;
    this._secondary = null;
    this._toastTimer = 0;
    this._lastHud = {};
    this._bind();
    this.setMuted(game.audio.isMuted());
  }

  UI.prototype._bind = function () {
    var self = this;
    var game = this.game;

    this.el.ovPrimary.addEventListener('click', function () {
      game.audio.unlock();
      game.audio.play('click');
      if (self._primary) self._primary();
    });
    this.el.ovSecondary.addEventListener('click', function () {
      game.audio.unlock();
      game.audio.play('click');
      if (self._secondary) self._secondary();
    });

    this.el.pause.addEventListener('click', function () {
      game.audio.unlock();
      game.audio.play('click');
      game.togglePause();
    });
    this.el.home.addEventListener('click', function () {
      game.audio.unlock();
      game.audio.play('click');
      game.goHome();
    });
    this.el.mute.addEventListener('click', function () {
      game.audio.unlock();
      game.toggleMute();
    });

    for (var d = 0; d < this.el.diffButtons.length; d++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          game.audio.unlock();
          game.audio.play('click');
          if (self._difficulty) self._difficulty(btn.getAttribute('data-diff'));
        });
      })(this.el.diffButtons[d]);
    }

    var dirs = ['up', 'left', 'down', 'right'];
    for (var i = 0; i < dirs.length; i++) {
      this._bindDir(this.el.pad.querySelector('[data-dir="' + dirs[i] + '"]'), dirs[i]);
    }

    var bomb = this.el.bomb;
    var pressBomb = function (e) {
      e.preventDefault();
      game.audio.unlock();
      self.game.input.pressBomb();
      bomb.classList.add('on');
    };
    var releaseBomb = function () {
      bomb.classList.remove('on');
    };
    bomb.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      try { bomb.setPointerCapture(e.pointerId); } catch (err) {}
      pressBomb(e);
    });
    bomb.addEventListener('pointerup', releaseBomb);
    bomb.addEventListener('pointercancel', releaseBomb);
    bomb.addEventListener('lostpointercapture', releaseBomb);
    bomb.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    window.addEventListener('blur', function () {
      self.clearPadVisual();
    });
  };

  UI.prototype._bindDir = function (btn, dir) {
    if (!btn) return;
    var self = this;
    var game = this.game;
    var press = function (e) {
      e.preventDefault();
      game.audio.unlock();
      self.game.input.setPad(dir, true);
      btn.classList.add('on');
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
    };
    var release = function () {
      self.game.input.setPad(dir, false);
      btn.classList.remove('on');
    };
    btn.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      press(e);
    });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };

  UI.prototype.clearPadVisual = function () {
    var on = this.el.pad.querySelectorAll('.on');
    for (var i = 0; i < on.length; i++) on[i].classList.remove('on');
  };

  UI.prototype.setMuted = function (muted) {
    this.el.mute.textContent = muted ? '🔇' : '🔊';
    this.el.mute.setAttribute('aria-pressed', muted ? 'true' : 'false');
  };

  UI.prototype.showOverlay = function (opts) {
    this.el.ovTitle.textContent = opts.title || '';
    this.el.ovBody.innerHTML = opts.body || '';
    this.el.ovPrimary.textContent = opts.primary || 'スタート';
    this.el.ovSecondary.textContent = opts.secondary || 'トップへ';
    this.el.ovSecondary.style.display = opts.secondary === null ? 'none' : '';
    this._primary = opts.onPrimary || null;
    this._secondary = opts.onSecondary || null;

    var showDiff = !!opts.showDifficulty;
    this.el.diff.style.display = showDiff ? 'flex' : 'none';
    this.el.diffHint.style.display = showDiff ? 'block' : 'none';
    this._difficulty = showDiff ? (opts.onDifficulty || null) : null;
    if (showDiff) this.setDifficulty(opts.difficulty || BM.DEFAULT_DIFFICULTY);

    this.el.overlay.classList.remove('hide');
  };

  UI.prototype.hideOverlay = function () {
    this.el.overlay.classList.add('hide');
    this._primary = null;
    this._secondary = null;
    this._difficulty = null;
  };

  UI.prototype.setDifficulty = function (key) {
    var diff = BM.DIFFICULTY[key] || BM.DIFFICULTY[BM.DEFAULT_DIFFICULTY];
    if (!diff) return;
    for (var i = 0; i < this.el.diffButtons.length; i++) {
      var btn = this.el.diffButtons[i];
      var on = btn.getAttribute('data-diff') === diff.key;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('on', on);
    }
    this.el.diffHint.textContent = '【' + diff.label + '】' + diff.desc;
  };

  UI.prototype.isOverlayVisible = function () {
    return !this.el.overlay.classList.contains('hide');
  };

  UI.prototype.toast = function (text) {
    var el = this.el.toast;
    el.textContent = text;
    el.classList.add('show');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    var self = this;
    this._toastTimer = setTimeout(function () {
      el.classList.remove('show');
      self._toastTimer = 0;
    }, 1100);
  };

  UI.prototype.updateHUD = function (world) {
    if (!world) return;
    var human = world.players[0];
    var time = Math.max(0, Math.ceil(world.timeLeft));
    var mm = Math.floor(time / 60);
    var ss = time % 60;
    var timeText = mm + ':' + (ss < 10 ? '0' + ss : ss);
    var cpu = world.aliveCPUs();

    if (this._lastHud.time !== timeText) {
      this.el.time.textContent = timeText;
      this.el.time.style.color = time <= 30 ? '#ff7a6a' : '';
      this._lastHud.time = timeText;
    }
    if (this._lastHud.lives !== human.lives) {
      this.el.lives.textContent = String(Math.max(0, human.lives));
      this._lastHud.lives = human.lives;
    }
    if (this._lastHud.cpu !== cpu) {
      this.el.cpu.textContent = String(cpu);
      this._lastHud.cpu = cpu;
    }
    if (this._lastHud.range !== human.range) {
      this.el.range.textContent = String(human.range);
      this._lastHud.range = human.range;
    }
    if (this._lastHud.bombs !== human.maxBombs) {
      this.el.bombs.textContent = String(human.maxBombs);
      this._lastHud.bombs = human.maxBombs;
    }
    var speed = human.speed.toFixed(1);
    if (this._lastHud.speed !== speed) {
      this.el.speed.textContent = speed;
      this._lastHud.speed = speed;
    }
  };

  BM.UI = UI;
})();
