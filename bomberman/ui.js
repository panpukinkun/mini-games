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
      score: $('hudScore'),
      round: $('hudRound'),
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
      dpad: $('dpad'),
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

    this._bindDpad();

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
      if (self._clearDpad) self._clearDpad();
    });
  };

  UI.prototype._bindDpad = function () {
    var self = this;
    var game = this.game;
    var dpad = this.el.dpad;
    if (!dpad) return;

    var dirs = ['up', 'left', 'down', 'right'];
    var active = null;
    var pointerId = null;
    var padRect = null;

    var buttons = {};
    for (var i = 0; i < dirs.length; i++) {
      buttons[dirs[i]] = dpad.querySelector('[data-dir="' + dirs[i] + '"]');
    }

    function setVisual(dir) {
      for (var j = 0; j < dirs.length; j++) {
        var btn = buttons[dirs[j]];
        if (btn) btn.classList.toggle('on', dirs[j] === dir);
      }
    }

    function setDir(dir) {
      if (dir === active) return;
      for (var j = 0; j < dirs.length; j++) game.input.setPad(dirs[j], false);
      active = dir;
      if (dir) game.input.setPad(dir, true);
      setVisual(dir);
    }

    function clear() {
      setDir(null);
    }

    function updateFromEvent(e) {
      if (!padRect) padRect = dpad.getBoundingClientRect();
      var cx = padRect.left + padRect.width / 2;
      var cy = padRect.top + padRect.height / 2;
      var dx = e.clientX - cx;
      var dy = e.clientY - cy;
      var dead = Math.min(padRect.width, padRect.height) * 0.16;
      if (dx * dx + dy * dy < dead * dead) {
        setDir(null);
        if (game.input.consumeTap) game.input.consumeTap();
        return;
      }
      setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    }

    function release(e) {
      if (pointerId !== null && e.pointerId !== undefined && e.pointerId !== pointerId) return;
      pointerId = null;
      padRect = null;
      clear();
    }

    dpad.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      game.audio.unlock();
      pointerId = e.pointerId;
      padRect = dpad.getBoundingClientRect();
      try { dpad.setPointerCapture(e.pointerId); } catch (err) {}
      updateFromEvent(e);
    });
    dpad.addEventListener('pointermove', function (e) {
      if (pointerId === null || e.pointerId !== pointerId) return;
      e.preventDefault();
      updateFromEvent(e);
    });
    dpad.addEventListener('pointerup', release);
    dpad.addEventListener('pointercancel', release);
    dpad.addEventListener('lostpointercapture', release);
    dpad.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    this._clearDpad = clear;
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
    var score = (this.game.matchScore || 0) + (world.score || 0);
    var round = this.game.round || 1;

    if (this._lastHud.time !== timeText) {
      this.el.time.textContent = timeText;
      this.el.time.style.color = time <= 30 ? '#ff7a6a' : '';
      this._lastHud.time = timeText;
    }
    if (this._lastHud.lives !== human.lives) {
      this.el.lives.textContent = String(Math.max(0, human.lives));
      this._lastHud.lives = human.lives;
    }
    if (this._lastHud.score !== score) {
      this.el.score.textContent = String(score);
      this._lastHud.score = score;
    }
    if (this._lastHud.round !== round) {
      this.el.round.textContent = round + '/3';
      this._lastHud.round = round;
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
