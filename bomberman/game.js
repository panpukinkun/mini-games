(function () {
  var BM = window.BM = window.BM || {};

  function Game() {
    this.canvas = document.getElementById('cv');
    this.ctx = this.canvas.getContext('2d');
    this.audio = new BM.SoundManager();
    this.input = new BM.InputHandler({
      onPause: this.togglePause.bind(this),
      onMute: this.toggleMute.bind(this)
    });
    this.ui = new BM.UI(this);
    this.loop = new BM.GameLoop(this.step.bind(this));

    this.difficulty = BM.Storage.get('bm_difficulty', BM.DEFAULT_DIFFICULTY);
    if (!BM.DIFFICULTY[this.difficulty]) this.difficulty = BM.DEFAULT_DIFFICULTY;
    this.world = new BM.World(this.difficulty);
    this.state = 'title';
    this.dpr = 1;
    this.cssW = 0;
    this.cssH = 0;
    this.board = { tile: 24, ox: 0, oy: 0, w: 0, h: 0 };
    this._lastTick = 0;
    this._resultShown = false;
    this.stats = BM.Storage.get('bm_stats', { wins: 0, losses: 0, draws: 0, best: null });
    this.sprites = null;
    this._spriteTile = 0;
    this._spriteDpr = 0;
    this._bgGradient = null;
    this._bgKey = '';

    this._bindWindow();
    this.resize();
    this.loop.start();
    this.showTitle();
  }

  Game.prototype._bindWindow = function () {
    var self = this;
    window.addEventListener('resize', function () { self.resize(); });
    window.addEventListener('orientationchange', function () {
      setTimeout(function () { self.resize(); }, 120);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && self.state === 'playing') self.togglePause();
    });
    window.addEventListener('blur', function () {
      if (self.state === 'playing') self.togglePause();
    });
  };

  Game.prototype.resize = function () {
    var stage = document.getElementById('stage');
    if (!stage) return;
    var rect = stage.getBoundingClientRect();
    var w = Math.max(1, Math.floor(rect.width));
    var h = Math.max(1, Math.floor(rect.height));
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssW = w;
    this.cssH = h;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';

    var cols = BM.CONFIG.COLS;
    var rows = BM.CONFIG.ROWS;
    var pad = 10;
    var tile = Math.min((w - pad * 2) / cols, (h - pad * 2) / rows);
    tile = Math.max(8, tile);
    var bw = cols * tile;
    var bh = rows * tile;
    this.board = {
      tile: tile,
      ox: Math.round((w - bw) / 2),
      oy: Math.round((h - bh) / 2),
      w: bw,
      h: bh
    };
    this.sprites = null;
    this._bgGradient = null;
  };

  Game.prototype.setDifficulty = function (key) {
    if (this.state !== 'title' || !BM.DIFFICULTY[key]) return;
    this.difficulty = key;
    BM.Storage.set('bm_difficulty', key);
    this.ui.setDifficulty(key);
    this.world = new BM.World(key);
    this.ui.updateHUD(this.world);
    this.ui.toast('難易度: ' + BM.DIFFICULTY[key].label);
  };

  Game.prototype.showTitle = function () {
    this.state = 'title';
    this._resultShown = false;
    this.world = new BM.World(this.difficulty);
    this.input.detach();
    this.input.clear();
    this.ui.hideOverlay();
    this.ui.updateHUD(this.world);

    var record = '';
    var s = this.stats;
    if (s && (s.wins || s.losses || s.draws)) {
      record = '<br><br>これまでの成績: <b>勝 ' + (s.wins || 0) + '</b> / 負 ' + (s.losses || 0) + ' / 引き分け ' + (s.draws || 0) + '</b>';
    }

    this.ui.showOverlay({
      title: '🎃 ボムボムパンプキン',
      body:
        '爆弾を置いて、かべをこわして、アイテムをとろう。<br>' +
        '爆風に当たるとライフが1つ減るよ。CPUを3体とも倒せば勝ち！<br><br>' +
        '<b>PC</b>: 矢印/WASDで移動、スペースかZで爆弾、P/Escでポーズ、Mでミュート<br>' +
        '<b>スマホ</b>: 十字キーと💣ボタン。画面をスクロールしないように固定しています。' +
        record,
      primary: 'スタート',
      onPrimary: this.start.bind(this),
      secondary: 'トップへ',
      onSecondary: this.goHome.bind(this),
      showDifficulty: true,
      difficulty: this.difficulty,
      onDifficulty: this.setDifficulty.bind(this)
    });
  };

  Game.prototype.start = function () {
    this.audio.unlock();
    this.audio.play('start');
    this.world = new BM.World(this.difficulty);
    this.state = 'playing';
    this._resultShown = false;
    this._lastTick = Math.ceil(this.world.timeLeft);
    this.input.clear();
    this.input.attach();
    this.ui.hideOverlay();
    this.ui.updateHUD(this.world);
    this.ui.toast('難易度: ' + BM.DIFFICULTY[this.difficulty].label + ' でスタート！');
  };

  Game.prototype.togglePause = function () {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.input.clear();
      this.audio.play('click');
      this.ui.showOverlay({
        title: '⏸ 一時停止',
        body: 'つづきから再開できます。<br>休けいするなら、ここでひとやすみ。',
        primary: '再開',
        onPrimary: this.resume.bind(this),
        secondary: 'トップへ',
        onSecondary: this.goHome.bind(this)
      });
    } else if (this.state === 'paused') {
      this.resume();
    }
  };

  Game.prototype.resume = function () {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.input.clear();
    this.audio.play('click');
    this.ui.hideOverlay();
  };

  Game.prototype.toggleMute = function () {
    var muted = this.audio.toggle();
    this.ui.setMuted(muted);
    this.ui.toast(muted ? '🔇 ミュート' : '🔊 音が出ます');
  };

  Game.prototype.goHome = function () {
    window.location.href = '../';
  };

  Game.prototype.step = function (dt) {
    if (this.state === 'playing') {
      this.world.update(dt, this.input);
      this._drainEvents();

      if (!this._resultShown && this.world.outcome) {
        this._resultShown = true;
        this.finish(this.world.outcome);
      }

      if (this.world.timeLeft <= 10) {
        var tick = Math.ceil(this.world.timeLeft);
        if (tick !== this._lastTick && tick > 0) {
          this._lastTick = tick;
          this.audio.play('tick');
        }
      }
    }

    this.ui.updateHUD(this.world);
    this.render();
  };

  Game.prototype._drainEvents = function () {
    var events = this.world.events;
    if (!events || !events.length) return;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e === 'bomb') {
        this.audio.play('bomb');
      } else if (e === 'explode') {
        this.audio.play('explode');
      } else if (e === 'hurt') {
        this.audio.play('hurt');
        this.ui.toast('💥 ライフがへった！');
      } else if (e === 'respawn') {
        this.audio.play('respawn');
      } else if (e.indexOf('item:') === 0) {
        var type = e.slice(5);
        this.audio.play('item');
        if (type === 'fire') this.ui.toast('🔥 火力アップ！');
        else if (type === 'bomb') this.ui.toast('💣 爆弾アップ！');
        else if (type === 'speed') this.ui.toast('⚡ スピードアップ！');
      } else if (e === 'item') {
        this.audio.play('item');
      }
    }
    events.length = 0;
  };

  Game.prototype.finish = function (outcome) {
    this.state = 'result';
    this.input.detach();
    this.input.clear();
    this.ui.clearPadVisual();

    var human = this.world.players[0];
    var used = Math.max(0, Math.round(this.world.elapsed));
    var mm = Math.floor(used / 60);
    var ss = used % 60;
    var timeText = mm + ':' + (ss < 10 ? '0' + ss : ss);
    var title = '';
    var body = '';
    var diffLabel = BM.DIFFICULTY[this.difficulty].label;

    if (outcome === 'win') {
      this.stats.wins = (this.stats.wins || 0) + 1;
      if (!this.stats.best || used < this.stats.best) this.stats.best = used;
      this.audio.play('win');
      title = '🎉 やったね！';
      body = '難易度 <b>' + diffLabel + '</b> / CPUをぜんぶ倒したよ！<br>タイム <b>' + timeText + '</b> / のこりライフ <b>' + human.lives + '</b>';
    } else if (outcome === 'lose') {
      this.stats.losses = (this.stats.losses || 0) + 1;
      this.audio.play('lose');
      title = '💥 ざんねん…';
      body = '難易度 <b>' + diffLabel + '</b> / ライフがなくなったよ。<br>もういちど挑戦してみよう！';
    } else {
      this.stats.draws = (this.stats.draws || 0) + 1;
      this.audio.play('lose');
      title = '⏱ ひきわけ';
      body = '難易度 <b>' + diffLabel + '</b> / 時間切れ！<br>のこりCPU <b>' + this.world.aliveCPUs() + '</b> 体 / のこりライフ <b>' + human.lives + '</b>';
    }

    BM.Storage.set('bm_stats', this.stats);
    this.ui.updateHUD(this.world);
    this.ui.showOverlay({
      title: title,
      body: body,
      primary: 'もういちど',
      onPrimary: this.start.bind(this),
      secondary: 'トップへ',
      onSecondary: this.goHome.bind(this)
    });
  };

  Game.prototype._ensureSprites = function () {
    var b = this.board;
    var t = b.tile;
    var dpr = this.dpr;
    if (!t || !dpr) return;
    if (this.sprites && this._spriteTile === t && this._spriteDpr === dpr) return;

    var self = this;
    function make(draw) {
      var cv = document.createElement('canvas');
      var size = Math.max(8, Math.ceil(t * dpr));
      cv.width = size;
      cv.height = size;
      var c = cv.getContext('2d');
      if (c.setTransform) c.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(c);
      return cv;
    }

    var floorA = make(function (c) {
      c.fillStyle = '#19112c';
      c.fillRect(0, 0, t, t);
      c.strokeStyle = 'rgba(255,255,255,0.035)';
      c.lineWidth = 1;
      c.strokeRect(0.5, 0.5, t - 1, t - 1);
    });
    var floorB = make(function (c) {
      c.fillStyle = '#1d1533';
      c.fillRect(0, 0, t, t);
      c.strokeStyle = 'rgba(255,255,255,0.035)';
      c.lineWidth = 1;
      c.strokeRect(0.5, 0.5, t - 1, t - 1);
    });
    var hard = make(function (c) { self._drawHard(c, 0, 0, t); });
    var soft = make(function (c) { self._drawSoft(c, 0, 0, t); });

    function itemSprite(type) {
      return make(function (c) {
        var color = type === 'fire' ? '#ff9a3d' : type === 'bomb' ? '#b06bff' : '#4ad6a0';
        var letter = type === 'fire' ? 'F' : type === 'bomb' ? 'B' : 'S';
        c.shadowColor = color;
        c.shadowBlur = t * 0.55;
        c.fillStyle = color;
        c.beginPath();
        c.arc(t / 2, t / 2, t * 0.3, 0, Math.PI * 2);
        c.fill();
        c.shadowBlur = 0;
        c.fillStyle = 'rgba(255,255,255,0.92)';
        c.font = '900 ' + Math.max(8, t * 0.34) + 'px system-ui, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(letter, t / 2, t / 2 + t * 0.02);
      });
    }

    var explosion = document.createElement('canvas');
    explosion.width = 128;
    explosion.height = 128;
    var ec = explosion.getContext('2d');
    var g = ec.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,220,1)');
    g.addColorStop(0.35, 'rgba(255,220,90,0.95)');
    g.addColorStop(0.7, 'rgba(255,120,40,0.72)');
    g.addColorStop(1, 'rgba(255,60,20,0)');
    ec.fillStyle = g;
    ec.fillRect(0, 0, 128, 128);

    this.sprites = {
      floorA: floorA,
      floorB: floorB,
      hard: hard,
      soft: soft,
      items: {
        fire: itemSprite('fire'),
        bomb: itemSprite('bomb'),
        speed: itemSprite('speed')
      },
      explosion: explosion
    };
    this._spriteTile = t;
    this._spriteDpr = dpr;
  };

  Game.prototype.render = function () {
    var ctx = this.ctx;
    var b = this.board;
    var w = this.cssW;
    var h = this.cssH;
    if (!ctx || !w || !h) return;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var bgKey = w + 'x' + h;
    if (!this._bgGradient || this._bgKey !== bgKey) {
      this._bgGradient = ctx.createRadialGradient(w * 0.5, h * 0.18, 0, w * 0.5, h * 0.55, Math.max(w, h) * 0.95);
      this._bgGradient.addColorStop(0, '#2c1946');
      this._bgGradient.addColorStop(0.55, '#160d26');
      this._bgGradient.addColorStop(1, '#09050f');
      this._bgKey = bgKey;
    }
    ctx.fillStyle = this._bgGradient;
    ctx.fillRect(0, 0, w, h);

    var shake = 0;
    if (this.state === 'playing' && this.world.shakeTime > 0) {
      shake = this.world.shakeMag * b.tile * 0.28;
    }
    ctx.save();
    if (shake) {
      ctx.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake);
    }

    this._ensureSprites();
    this._drawBoard(ctx, b);
    this._drawItems(ctx, b);
    this._drawBombs(ctx, b);
    this._drawExplosions(ctx, b);
    this._drawPlayers(ctx, b);
    this._drawParticles(ctx, b);

    ctx.restore();

    if (this.state === 'title') {
      ctx.fillStyle = 'rgba(8,5,16,0.18)';
      ctx.fillRect(0, 0, w, h);
    }
  };

  Game.prototype._roundRect = function (ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  Game.prototype._drawBoard = function (ctx, b) {
    var t = b.tile;
    var map = this.world.map;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 154, 61, 0.18)';
    ctx.shadowBlur = Math.max(10, t * 0.7);
    ctx.fillStyle = 'rgba(10, 6, 20, 0.72)';
    this._roundRect(ctx, b.ox - 6, b.oy - 6, b.w + 12, b.h + 12, t * 0.32);
    ctx.fill();
    ctx.restore();

    for (var y = 0; y < map.rows; y++) {
      for (var x = 0; x < map.cols; x++) {
        var px = b.ox + x * t;
        var py = b.oy + y * t;
        var cell = map.cell(x, y);

        if (cell === BM.CELL.HARD) {
          ctx.drawImage(this.sprites.hard, px, py, t, t);
        } else if (cell === BM.CELL.SOFT) {
          ctx.drawImage(this.sprites.soft, px, py, t, t);
        } else {
          ctx.drawImage((x + y) % 2 === 0 ? this.sprites.floorA : this.sprites.floorB, px, py, t, t);
        }
      }
    }
  };

  Game.prototype._drawHard = function (ctx, x, y, t) {
    ctx.fillStyle = '#241b3d';
    ctx.fillRect(x, y, t, t);
    ctx.fillStyle = '#33264f';
    ctx.fillRect(x + t * 0.08, y + t * 0.08, t * 0.84, t * 0.5);
    ctx.fillStyle = '#1a122c';
    ctx.fillRect(x + t * 0.08, y + t * 0.62, t * 0.84, t * 0.3);
    ctx.strokeStyle = 'rgba(255, 176, 92, 0.16)';
    ctx.lineWidth = Math.max(1, t * 0.035);
    ctx.strokeRect(x + t * 0.08, y + t * 0.08, t * 0.84, t * 0.84);
  };

  Game.prototype._drawSoft = function (ctx, x, y, t) {
    ctx.fillStyle = '#8f4a22';
    ctx.fillRect(x + t * 0.04, y + t * 0.04, t * 0.92, t * 0.92);
    ctx.fillStyle = '#c97934';
    ctx.fillRect(x + t * 0.1, y + t * 0.1, t * 0.8, t * 0.8);
    ctx.fillStyle = '#e59a4f';
    ctx.fillRect(x + t * 0.1, y + t * 0.1, t * 0.8, t * 0.18);
    ctx.strokeStyle = 'rgba(80, 34, 12, 0.55)';
    ctx.lineWidth = Math.max(1, t * 0.04);
    ctx.beginPath();
    ctx.moveTo(x + t * 0.1, y + t * 0.5);
    ctx.lineTo(x + t * 0.9, y + t * 0.5);
    ctx.moveTo(x + t * 0.5, y + t * 0.1);
    ctx.lineTo(x + t * 0.5, y + t * 0.9);
    ctx.stroke();

    var s = t * 0.1;
    ctx.fillStyle = '#4a210c';
    ctx.beginPath();
    ctx.moveTo(x + t * 0.32, y + t * 0.32);
    ctx.lineTo(x + t * 0.42, y + t * 0.4);
    ctx.lineTo(x + t * 0.32, y + t * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + t * 0.68, y + t * 0.32);
    ctx.lineTo(x + t * 0.58, y + t * 0.4);
    ctx.lineTo(x + t * 0.68, y + t * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4a210c';
    ctx.lineWidth = Math.max(1, t * 0.06);
    ctx.beginPath();
    ctx.arc(x + t * 0.5, y + t * 0.52, s * 1.7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  };

  Game.prototype._drawItems = function (ctx, b) {
    var t = b.tile;
    var self = this;
    this.world.items.forEach(function (type, key) {
      var parts = key.split(',');
      var cx = b.ox + Number(parts[0]) * t + t / 2;
      var cy = b.oy + Number(parts[1]) * t + t / 2;
      var spr = self.sprites.items[type] || self.sprites.items.speed;
      var pulse = 0.94 + Math.sin(self.world.elapsed * 6 + cx) * 0.06;
      var size = t * pulse;
      ctx.drawImage(spr, cx - size / 2, cy - size / 2, size, size);
    });
  };

  Game.prototype._drawBombs = function (ctx, b) {
    var t = b.tile;
    for (var i = 0; i < this.world.bombs.length; i++) {
      var bomb = this.world.bombs[i];
      if (!bomb.active) continue;
      var cx = b.ox + (bomb.cx + 0.5) * t;
      var cy = b.oy + (bomb.cy + 0.5) * t;
      var ratio = Math.max(0, bomb.fuse / bomb.maxFuse);
      var pulse = 1 + Math.sin((1 - ratio) * 22) * 0.08;
      var r = t * 0.31 * pulse;

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + t * 0.25, r * 0.95, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#16121f';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(cx - r * 0.32, cy - r * 0.32, r * 0.32, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#c98b4b';
      ctx.lineWidth = Math.max(1, t * 0.06);
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.2, cy - r * 0.85);
      ctx.quadraticCurveTo(cx + r * 1.0, cy - r * 1.5, cx + r * 0.55, cy - r * 1.8);
      ctx.stroke();

      ctx.fillStyle = ratio < 0.35 ? '#ff5a3d' : '#ffd76a';
      ctx.beginPath();
      ctx.arc(cx + r * 0.55, cy - r * 1.8, Math.max(1.5, t * 0.075), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  Game.prototype._drawExplosions = function (ctx, b) {
    var t = b.tile;
    this.world.explosions.forEach(function (ex) {
      var cx = b.ox + (ex.cx + 0.5) * t;
      var cy = b.oy + (ex.cy + 0.5) * t;
      var life = Math.max(0, Math.min(1, ex.time / ex.max));
      var r = t * (0.42 + 0.28 * Math.sin((1 - life) * Math.PI));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = life;
      ctx.drawImage(this.sprites.explosion, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    }, this);
  };

  Game.prototype._drawPlayers = function (ctx, b) {
    var t = b.tile;
    for (var i = 0; i < this.world.players.length; i++) {
      var p = this.world.players[i];
      if (!p.alive) continue;
      if (p.invuln > 0 && Math.floor(this.world.elapsed * 12) % 2 === 0) continue;

      var cx = b.ox + p.x * t;
      var cy = b.oy + p.y * t;
      var r = t * 0.34;

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.72, r * 0.95, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!p.isCPU) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = Math.max(1.5, t * 0.06);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(cx - r * 0.3, cy - r * 0.34, r * 0.32, 0, Math.PI * 2);
      ctx.fill();

      var ex = p.dir.x * r * 0.16;
      var ey = p.dir.y * r * 0.16;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx - r * 0.28 + ex, cy - r * 0.08 + ey, Math.max(1.4, r * 0.18), 0, Math.PI * 2);
      ctx.arc(cx + r * 0.28 + ex, cy - r * 0.08 + ey, Math.max(1.4, r * 0.18), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1020';
      ctx.beginPath();
      ctx.arc(cx - r * 0.26 + ex, cy - r * 0.08 + ey, Math.max(0.8, r * 0.09), 0, Math.PI * 2);
      ctx.arc(cx + r * 0.30 + ex, cy - r * 0.08 + ey, Math.max(0.8, r * 0.09), 0, Math.PI * 2);
      ctx.fill();

      if (!p.isCPU) {
        ctx.fillStyle = '#ffd76a';
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.34, cy - r * 1.5);
        ctx.lineTo(cx - r * 0.1, cy - r * 1.16);
        ctx.lineTo(cx - r * 0.58, cy - r * 1.16);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  };

  Game.prototype._drawParticles = function (ctx, b) {
    var t = b.tile;
    for (var i = 0; i < this.world.particles.length; i++) {
      var p = this.world.particles[i];
      var alpha = Math.max(0, Math.min(1, p.life / p.max));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(b.ox + p.x * t, b.oy + p.y * t, Math.max(1, p.size * t), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  window.addEventListener('DOMContentLoaded', function () {
    if (!window.__BM_GAME__) {
      window.__BM_GAME__ = new Game();
    }
  });

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    if (!window.__BM_GAME__) window.__BM_GAME__ = new Game();
  }

  BM.Game = Game;
})();
