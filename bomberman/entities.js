(function () {
  var BM = window.BM = window.BM || {};
  var C = BM.CONFIG;

  class Bomb {
    constructor(id, cx, cy, owner, range) {
      this.id = id;
      this.cx = cx;
      this.cy = cy;
      this.owner = owner;
      this.placer = owner;
      this.range = range;
      this.fuse = C.BOMB_FUSE;
      this.maxFuse = C.BOMB_FUSE;
      this.active = true;
      this.exploded = false;
      this.queued = false;
    }

    ownerOverlaps() {
      if (!this.owner) return false;
      var h = C.HITBOX / 2;
      var ox = this.owner.x;
      var oy = this.owner.y;
      return ox + h > this.cx && ox - h < this.cx + 1 && oy + h > this.cy && oy - h < this.cy + 1;
    }

    update(dt, world) {
      if (!this.active) return;
      this.fuse -= dt;

      if (this.owner && !this.ownerOverlaps()) {
        this.owner = null;
      }

      if (this.fuse <= 0 && !this.queued) {
        this.queued = true;
        world.queueExplosion(this);
      }
    }
  }

  class Player {
    constructor(id, name, isCPU, color, spawn, diff) {
      this.id = id;
      this.name = name;
      this.isCPU = isCPU;
      this.color = color;
      this.spawn = { x: spawn.x, y: spawn.y };
      this.diff = diff || BM.DIFFICULTY[BM.DEFAULT_DIFFICULTY];

      this.x = spawn.x + 0.5;
      this.y = spawn.y + 0.5;
      this.tileX = spawn.x;
      this.tileY = spawn.y;
      this.fromX = spawn.x;
      this.fromY = spawn.y;
      this.toX = spawn.x;
      this.toY = spawn.y;
      this.moveProgress = 0;
      this.moveDir = null;
      this.desiredDir = null;
      this.moving = false;
      this.justArrived = false;
      this.blocked = false;
      this.speed = isCPU ? this.diff.CPU_SPEED : this.diff.PLAYER_SPEED;
      this.maxBombs = C.START_BOMBS;
      this.range = C.START_RANGE;
      this.lives = isCPU ? 1 : this.diff.PLAYER_LIVES;
      this.maxLives = this.lives;

      this.alive = true;
      this.invuln = 0;
      this.respawn = 0;
      this.activeBombs = 0;

      this.dir = { x: 0, y: 1 };
      this.lastAxis = 'y';
      this.moving = false;
      this.anim = 0;

      this.ai = isCPU && BM.CPUAI ? new BM.CPUAI() : null;
    }

    collides(world, x, y) {
      var h = C.HITBOX / 2;
      var x0 = Math.floor(x - h + 0.000001);
      var x1 = Math.floor(x + h - 0.000001);
      var y0 = Math.floor(y - h + 0.000001);
      var y1 = Math.floor(y + h - 0.000001);

      for (var cy = y0; cy <= y1; cy++) {
        for (var cx = x0; cx <= x1; cx++) {
          if (world.map.cell(cx, cy) !== BM.CELL.EMPTY) return true;
          var bomb = world.bombAt(cx, cy);
          if (bomb && bomb.owner !== this) return true;
        }
      }
      return false;
    }

    updateFree(dt, world, input) {
      var cmd = this.ai.think(this, world, dt);
      if (cmd.bomb) this.placeBomb(world);

      var dx = cmd.x ? Math.sign(cmd.x) : 0;
      var dy = cmd.y ? Math.sign(cmd.y) : 0;

      if (dx && dy) {
        if (this.lastAxis === 'x') dy = 0;
        else dx = 0;
      }

      if (dx) {
        this.lastAxis = 'x';
        this.dir = { x: dx, y: 0 };
      } else if (dy) {
        this.lastAxis = 'y';
        this.dir = { x: 0, y: dy };
      }

      this.moving = !!(dx || dy);

      if (dx) this.axisMoveFree(world, dx * this.speed * dt, 0, dt);
      else if (dy) this.axisMoveFree(world, 0, dy * this.speed * dt, dt);
    }

    axisMoveFree(world, mx, my, dt) {
      if (!this.collides(world, this.x + mx, this.y + my)) {
        this.x += mx;
        this.y += my;
        return;
      }

      var assist = Math.min(Math.abs(mx || my), this.speed * dt);

      if (mx !== 0) {
        var cy = Math.floor(this.y) + 0.5;
        var diffY = cy - this.y;
        if (Math.abs(diffY) > 0.015 && Math.abs(diffY) <= C.CORNER_ASSIST) {
          var ny = this.y + Math.sign(diffY) * Math.min(Math.abs(diffY), assist);
          if (!this.collides(world, this.x, ny)) this.y = ny;
        }
      } else if (my !== 0) {
        var cx = Math.floor(this.x) + 0.5;
        var diffX = cx - this.x;
        if (Math.abs(diffX) > 0.015 && Math.abs(diffX) <= C.CORNER_ASSIST) {
          var nx = this.x + Math.sign(diffX) * Math.min(Math.abs(diffX), assist);
          if (!this.collides(world, nx, this.y)) this.x = nx;
        }
      }

      if (!this.collides(world, this.x + mx, this.y + my)) {
        this.x += mx;
        this.y += my;
      }
    }

    canEnter(world, nx, ny) {
      if (nx < 0 || ny < 0 || nx >= world.map.cols || ny >= world.map.rows) return false;
      if (world.map.cell(nx, ny) !== BM.CELL.EMPTY) return false;
      if (world.bombAt(nx, ny)) return false;
      return true;
    }

    tryStart(world) {
      var d = this.desiredDir;
      if (!d) return false;
      var nx = this.tileX + d.x;
      var ny = this.tileY + d.y;
      if (!this.canEnter(world, nx, ny)) {
        this.blocked = true;
        return false;
      }

      this.blocked = false;
      this.fromX = this.tileX;
      this.fromY = this.tileY;
      this.toX = nx;
      this.toY = ny;
      this.moveDir = { x: d.x, y: d.y };
      this.dir = { x: d.x, y: d.y };
      this.moveProgress = 0;
      this.moving = true;
      return true;
    }

    update(dt, world, input) {
      if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
      this.anim += dt;

      if (this.isCPU && this.ai) {
        this.updateFree(dt, world, input);
        return;
      }

      var d = input ? input.getDirection() : { x: 0, y: 0 };
      var cmd = { x: d.x, y: d.y, bomb: input ? input.takeBomb() : false };

      if (cmd.bomb) this.placeBomb(world);

      var dx = cmd.x ? Math.sign(cmd.x) : 0;
      var dy = cmd.y ? Math.sign(cmd.y) : 0;

      if (dx && dy) {
        if (this.lastAxis === 'x') dy = 0;
        else dx = 0;
      }

      if (dx || dy) {
        this.lastAxis = dx ? 'x' : 'y';
        this.dir = { x: dx, y: dy };
        this.desiredDir = { x: dx, y: dy };
      } else {
        this.desiredDir = null;
      }

      if (this.moving) {
        this.moveProgress += this.speed * dt;
        if (this.moveProgress >= 1) {
          this.tileX = this.toX;
          this.tileY = this.toY;
          this.x = this.tileX + 0.5;
          this.y = this.tileY + 0.5;
          this.moveProgress = 0;
          this.moving = false;
          this.moveDir = null;
          this.justArrived = true;
          if (this.desiredDir) this.tryStart(world);
        } else {
          var p = this.moveProgress;
          this.x = (this.fromX + 0.5) + (this.toX - this.fromX) * p;
          this.y = (this.fromY + 0.5) + (this.toY - this.fromY) * p;
        }
      } else {
        this.x = this.tileX + 0.5;
        this.y = this.tileY + 0.5;
        if (this.desiredDir) this.tryStart(world);
      }
    }

    placeBomb(world) {
      if (!this.alive) return false;
      if (this.activeBombs >= this.maxBombs) return false;

      var cx;
      var cy;
      if (this.isCPU) {
        cx = Math.floor(this.x);
        cy = Math.floor(this.y);
      } else if (this.moving) {
        cx = Math.round(this.x - 0.5);
        cy = Math.round(this.y - 0.5);
      } else {
        cx = this.tileX;
        cy = this.tileY;
      }
      if (world.map.cell(cx, cy) !== BM.CELL.EMPTY) return false;
      if (world.bombAt(cx, cy)) return false;

      world.addBomb(this, cx, cy, this.range);
      return true;
    }

    applyItem(type, world) {
      if (type === 'fire') {
        this.range = Math.min(C.MAX_RANGE, this.range + 1);
      } else if (type === 'bomb') {
        this.maxBombs = Math.min(C.MAX_BOMBS, this.maxBombs + 1);
      } else if (type === 'speed') {
        this.speed = Math.min(C.MAX_SPEED, this.speed + C.SPEED_STEP);
      }
      world.events.push('item:' + type);
    }

    hit(world) {
      if (!this.alive || this.invuln > 0) return;

      this.lives--;
      this.alive = false;
      this.activeBombs = 0;
      this.moving = false;
      this.moveProgress = 0;
      this.moveDir = null;
      this.desiredDir = null;

      for (var i = 0; i < world.bombs.length; i++) {
        if (world.bombs[i].owner === this) world.bombs[i].owner = null;
        if (world.bombs[i].placer === this) world.bombs[i].placer = null;
      }

      world.addShake(C.SHAKE_TIME, C.SHAKE_POWER);
      world.burst(this.x, this.y, this.color, 24, 3.2);
      world.burst(this.x, this.y, '#ffd76a', 10, 2.2);
      world.events.push('hurt');

      if (this.lives > 0) this.respawn = C.RESPAWN_DELAY;
    }

    updateDead(dt, world) {
      if (this.lives <= 0) return;
      this.respawn -= dt;
      if (this.respawn > 0) return;

      if (!world.isSpawnClear(this.spawn)) {
        this.respawn = 0.2;
        return;
      }

      this.x = this.spawn.x + 0.5;
      this.y = this.spawn.y + 0.5;
      this.tileX = this.spawn.x;
      this.tileY = this.spawn.y;
      this.fromX = this.spawn.x;
      this.fromY = this.spawn.y;
      this.toX = this.spawn.x;
      this.toY = this.spawn.y;
      this.moveProgress = 0;
      this.moveDir = null;
      this.desiredDir = null;
      this.justArrived = false;
      this.blocked = false;
      this.alive = true;
      this.invuln = C.INVULN_TIME;
      this.activeBombs = 0;
      this.dir = { x: 0, y: 1 };
      this.moving = false;
      this.anim = 0;

      world.burst(this.x, this.y, this.color, 18, 2.4);
      world.events.push('respawn');
    }
  }

  class World {
    constructor(difficultyKey) {
      this.difficultyKey = BM.DIFFICULTY[difficultyKey] ? difficultyKey : BM.DEFAULT_DIFFICULTY;
      this.diff = BM.DIFFICULTY[this.difficultyKey];
      this.map = new BM.MapManager();
      this.reset();
    }

    reset() {
      this.map.generate();

      this.players = [];
      this.bombs = [];
      this.bombGrid = new Map();
      this.explosions = new Map();
      this.items = new Map();
      this.pendingItems = [];
      this.particles = [];
      this.explosionQueue = [];
      this.events = [];

      this.timeLeft = this.diff.MATCH_TIME;
      this.elapsed = 0;
      this.score = 0;
      this.score = 0;
      this.outcome = null;
      this.shakeTime = 0;
      this.shakeMag = 0;
      this.nextBombId = 1;

      for (var i = 0; i < C.SPAWNS.length; i++) {
        var isCPU = i > 0;
        var color = isCPU ? C.COLORS.cpus[i - 1] : C.COLORS.player;
        this.players.push(new Player(i, C.NAMES[i], isCPU, color, C.SPAWNS[i], this.diff));
      }
    }

    bombAt(cx, cy) {
      return this.bombGrid.get(BM.key(cx, cy)) || null;
    }

    addBomb(owner, cx, cy, range) {
      var bomb = new Bomb(this.nextBombId++, cx, cy, owner, range);
      this.bombs.push(bomb);
      this.bombGrid.set(BM.key(cx, cy), bomb);
      owner.activeBombs++;
      this.burst(cx + 0.5, cy + 0.5, '#ffd76a', 6, 1.4);
      this.events.push('bomb');
      return bomb;
    }

    queueExplosion(bomb) {
      this.explosionQueue.push(bomb);
    }

    processExplosions() {
      while (this.explosionQueue.length) {
        var bomb = this.explosionQueue.shift();
        if (!bomb || bomb.exploded) continue;
        bomb.exploded = true;
        bomb.active = false;

        if (bomb.placer && bomb.placer.activeBombs > 0) {
          bomb.placer.activeBombs--;
        }

        this.removeBomb(bomb);
        this.detonate(bomb);
      }
    }

    removeBomb(bomb) {
      var k = BM.key(bomb.cx, bomb.cy);
      if (this.bombGrid.get(k) === bomb) this.bombGrid.delete(k);
      var index = this.bombs.indexOf(bomb);
      if (index >= 0) this.bombs.splice(index, 1);
    }

    detonate(bomb) {
      this.addBlastCell(bomb.cx, bomb.cy);

      for (var d = 0; d < BM.DIRS.length; d++) {
        var dir = BM.DIRS[d];
        for (var i = 1; i <= bomb.range; i++) {
          var cx = bomb.cx + dir.x * i;
          var cy = bomb.cy + dir.y * i;
          var cell = this.map.cell(cx, cy);

          if (cell === BM.CELL.HARD) break;

          this.addBlastCell(cx, cy);

          if (cell === BM.CELL.SOFT) {
            this.map.destroySoft(cx, cy);
            if (bomb.placer && bomb.placer.id === 0) this.score += 10;
            this.maybeSpawnItem(cx, cy);
            break;
          }

          var other = this.bombAt(cx, cy);
          if (other) {
            if (!other.queued) {
              other.queued = true;
              this.queueExplosion(other);
            }
            break;
          }
        }
      }

      this.addShake(C.SHAKE_TIME, C.SHAKE_POWER);
      this.burst(bomb.cx + 0.5, bomb.cy + 0.5, '#ff9a3d', 18, 3.2);
      this.burst(bomb.cx + 0.5, bomb.cy + 0.5, '#ffe27a', 8, 2.2);
      this.events.push('explode');
    }

    addBlastCell(cx, cy) {
      var k = BM.key(cx, cy);
      var existing = this.explosions.get(k);
      if (existing) {
        existing.time = Math.max(existing.time, C.EXPLOSION_TIME);
      } else {
        this.explosions.set(k, {
          cx: cx,
          cy: cy,
          time: C.EXPLOSION_TIME,
          max: C.EXPLOSION_TIME,
          seed: Math.random() * Math.PI * 2
        });
      }
      this.items.delete(k);
    }

    maybeSpawnItem(cx, cy) {
      if (Math.random() >= C.ITEM_CHANCE) return;

      var r = Math.random();
      var acc = 0;
      var type = 'speed';
      for (var i = 0; i < C.ITEM_BY_WEIGHT.length; i++) {
        var name = C.ITEM_BY_WEIGHT[i];
        acc += C.ITEM_WEIGHTS[name];
        if (r <= acc) {
          type = name;
          break;
        }
      }

      this.pendingItems.push({
        cx: cx,
        cy: cy,
        type: type,
        delay: C.EXPLOSION_TIME + C.ITEM_SPAWN_DELAY
      });
    }

    updatePendingItems(dt) {
      for (var i = this.pendingItems.length - 1; i >= 0; i--) {
        var item = this.pendingItems[i];
        item.delay -= dt;
        if (item.delay > 0) continue;

        var k = BM.key(item.cx, item.cy);
        if (this.map.cell(item.cx, item.cy) !== BM.CELL.EMPTY || this.bombAt(item.cx, item.cy) || this.items.has(k)) {
          item.delay = 0.2;
          continue;
        }

        this.items.set(k, item.type);
        this.pendingItems.splice(i, 1);
      }
    }

    pickupItems() {
      var h = C.PICKUP_HITBOX / 2;

      for (var p = 0; p < this.players.length; p++) {
        var player = this.players[p];
        if (!player.alive) continue;

        var x0 = Math.floor(player.x - h + 0.000001);
        var x1 = Math.floor(player.x + h - 0.000001);
        var y0 = Math.floor(player.y - h + 0.000001);
        var y1 = Math.floor(player.y + h - 0.000001);

        for (var cy = y0; cy <= y1; cy++) {
          for (var cx = x0; cx <= x1; cx++) {
            var k = BM.key(cx, cy);
            var type = this.items.get(k);
            if (!type) continue;
            this.items.delete(k);
            if (player.id === 0) this.score += 50;
            player.applyItem(type, this);
            this.burst(cx + 0.5, cy + 0.5, type === 'fire' ? '#ff9a3d' : type === 'bomb' ? '#b06bff' : '#4ad6a0', 14, 2.2);
          }
        }
      }
    }

    applyExplosionDamage() {
      var h = C.DAMAGE_HITBOX / 2;

      for (var p = 0; p < this.players.length; p++) {
        var player = this.players[p];
        if (!player.alive || player.invuln > 0) continue;

        var x0 = Math.floor(player.x - h + 0.000001);
        var x1 = Math.floor(player.x + h - 0.000001);
        var y0 = Math.floor(player.y - h + 0.000001);
        var y1 = Math.floor(player.y + h - 0.000001);

        var hit = false;
        for (var cy = y0; cy <= y1 && !hit; cy++) {
          for (var cx = x0; cx <= x1; cx++) {
            if (this.explosions.has(BM.key(cx, cy))) {
              hit = true;
              break;
            }
          }
        }

        if (hit) player.hit(this);
      }
    }

    isSpawnClear(spawn) {
      if (this.map.cell(spawn.x, spawn.y) !== BM.CELL.EMPTY) return false;
      if (this.bombAt(spawn.x, spawn.y)) return false;
      return !this.explosions.has(BM.key(spawn.x, spawn.y));
    }

    addShake(time, power) {
      this.shakeTime = Math.max(this.shakeTime, time);
      this.shakeMag = Math.max(this.shakeMag, power);
    }

    burst(x, y, color, count, power) {
      for (var i = 0; i < count; i++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = BM.rand(0.4, 1) * power;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: BM.rand(0.3, 0.7),
          max: 0.7,
          size: BM.rand(0.05, 0.13),
          color: color
        });
      }
    }

    updateParticles(dt) {
      for (var i = this.particles.length - 1; i >= 0; i--) {
        var p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 2.4 * dt;
        p.vx *= 0.985;
      }
    }

    aliveCPUs() {
      var count = 0;
      for (var i = 1; i < this.players.length; i++) {
        if (this.players[i].lives > 0) count++;
      }
      return count;
    }

    checkOutcome() {
      if (this.outcome) return;

      var human = this.players[0];
      if (human.lives <= 0) {
        this.outcome = 'lose';
        return;
      }

      if (this.aliveCPUs() === 0) {
        this.outcome = 'win';
        return;
      }

      if (this.timeLeft <= 0) this.outcome = 'draw';
    }

    update(dt, input) {
      if (this.outcome) return;

      this.elapsed += dt;
      this.timeLeft = Math.max(0, this.timeLeft - dt);

      if (input && this.players[0] && !this.players[0].alive) input.takeBomb();

      for (var i = 0; i < this.players.length; i++) {
        var player = this.players[i];
        if (player.alive) player.update(dt, this, input);
        else player.updateDead(dt, this);
      }

      for (var b = this.bombs.length - 1; b >= 0; b--) {
        if (this.bombs[b].active) this.bombs[b].update(dt, this);
      }

      this.processExplosions();
      this.applyExplosionDamage();

      for (var entry of this.explosions) {
        entry[1].time -= dt;
        if (entry[1].time <= 0) this.explosions.delete(entry[0]);
      }

      this.updatePendingItems(dt);
      this.pickupItems();
      this.updateParticles(dt);

      this.shakeTime = Math.max(0, this.shakeTime - dt);
      if (this.shakeTime <= 0) this.shakeMag = 0;

      this.checkOutcome();
    }
  }

  BM.Bomb = Bomb;
  BM.Player = Player;
  BM.World = World;
})();
