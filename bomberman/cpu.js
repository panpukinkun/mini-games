(function () {
  var BM = window.BM = window.BM || {};
  var C = BM.CONFIG;

  class CPUAI {
    constructor() {
      this.dir = { x: 0, y: 0 };
      this.pendingBomb = false;
      this.timer = 0;
      this.lastX = 0;
      this.lastY = 0;
      this.stuck = 0;
      this.panic = 0;
      this.initialized = false;
      this.escapeDir = null;
      this.escapeTimer = 0;
    }

    think(player, world, dt) {
      if (!this.initialized) {
        this.lastX = player.x;
        this.lastY = player.y;
        this.initialized = true;
      }

      var moved = Math.sqrt(
        (player.x - this.lastX) * (player.x - this.lastX) +
        (player.y - this.lastY) * (player.y - this.lastY)
      );
      this.lastX = player.x;
      this.lastY = player.y;

      if (this.panic > 0) this.panic -= dt;
      if (this.escapeTimer > 0) this.escapeTimer -= dt;
      else this.escapeDir = null;

      if (moved < 0.006 && (this.dir.x || this.dir.y)) {
        this.stuck += dt;
      } else {
        this.stuck = Math.max(0, this.stuck - dt * 2);
      }

      if (this.stuck > 0.55) {
        this.stuck = 0;
        this.panic = 0.2;
        this.timer = 0;
        var stuckCell = { x: Math.floor(player.x), y: Math.floor(player.y) };
        this.dir = this.wander(stuckCell, world, this.dangerMap(world));
      }

      this.timer -= dt;

      if (this.panic <= 0 && this.timer <= 0) {
        var d = player.diff || BM.DIFFICULTY[BM.DEFAULT_DIFFICULTY];
        this.timer = d.CPU_DECISION_MIN + Math.random() * (d.CPU_DECISION_MAX - d.CPU_DECISION_MIN);
        var decision = this.decide(player, world);
        this.dir = decision.dir;
        this.pendingBomb = decision.bomb;
      }

      var bomb = this.pendingBomb;
      this.pendingBomb = false;

      return { x: this.dir.x, y: this.dir.y, bomb: bomb };
    }

    decide(player, world) {
      var cell = { x: Math.floor(player.x), y: Math.floor(player.y) };
      var danger = this.dangerMap(world);
      var inDanger = this.inDangerAt(player.x, player.y, danger);

      if (inDanger) {
        if (this.escapeTimer > 0 && this.escapeDir) {
          return { dir: this.escapeDir, bomb: false };
        }

        var centerStep = this.centerStep(player, danger);
        if (centerStep) {
          this.escapeDir = centerStep;
          this.escapeTimer = 0.2;
          return { dir: centerStep, bomb: false };
        }

        var escapeStep = this.stepToward(
          cell, world, player,
          function (c) { return !danger[BM.key(c.x, c.y)]; },
          danger, 6
        );
        if (escapeStep) {
          this.escapeDir = escapeStep;
          this.escapeTimer = 0.35;
          return { dir: escapeStep, bomb: false };
        }

        var anyStep = this.stepToward(cell, world, player, function () { return false; }, null, 4);
        if (anyStep) {
          this.escapeDir = anyStep;
          this.escapeTimer = 0.2;
        }
        return { dir: anyStep || { x: 0, y: 0 }, bomb: false };
      }

      this.escapeDir = null;
      this.escapeTimer = 0;

      var canEscape = this.escapeExists(player, world, cell);
      var softAdjacent = this.adjacentSoft(cell, world);
      var human = this.humanTarget(world);
      var diff = player.diff || BM.DIFFICULTY[BM.DEFAULT_DIFFICULTY];

      if (softAdjacent && canEscape && Math.random() < diff.CPU_BOMB_CHANCE) {
        return { dir: { x: 0, y: 0 }, bomb: true };
      }

      if (human) {
        var hc = { x: Math.floor(human.x), y: Math.floor(human.y) };
        var dist = Math.abs(hc.x - cell.x) + Math.abs(hc.y - cell.y);
        var aligned = hc.x === cell.x || hc.y === cell.y;

        if (dist > 0 && dist <= player.range && aligned && canEscape) {
          return { dir: { x: 0, y: 0 }, bomb: true };
        }

        var path = this.stepToward(
          cell, world, player,
          function (c) { return c.x === hc.x && c.y === hc.y; },
          danger, 40, false
        );

        if (path) {
          if (softAdjacent && canEscape) return { dir: { x: 0, y: 0 }, bomb: true };
          return { dir: path, bomb: false };
        }
      }

      if (diff.CPU_ITEM_PICKUP) {
        var itemStep = this.stepToward(
          cell, world, player,
          function (c) { return world.items.has(BM.key(c.x, c.y)); },
          danger, 8, false
        );
        if (itemStep) return { dir: itemStep, bomb: false };
      }

      if (softAdjacent && canEscape) {
        return { dir: { x: 0, y: 0 }, bomb: true };
      }

      var self = this;
      var softStep = this.stepToward(
        cell, world, player,
        function (c) { return self.adjacentSoft(c, world); },
        danger, 40, false
      );
      if (softStep) return { dir: softStep, bomb: false };

      return { dir: this.wander(cell, world, danger), bomb: false };
    }

    centerStep(player, danger) {
      var cx = Math.floor(player.x) + 0.5;
      var cy = Math.floor(player.y) + 0.5;
      var dx = cx - player.x;
      var dy = cy - player.y;

      if (Math.abs(dx) > 0.18 && !this.inDangerAt(cx, player.y, danger)) {
        return { x: Math.sign(dx), y: 0 };
      }
      if (Math.abs(dy) > 0.18 && !this.inDangerAt(player.x, cy, danger)) {
        return { x: 0, y: Math.sign(dy) };
      }
      return null;
    }

    inDangerAt(x, y, danger) {
      var h = C.HITBOX / 2;
      var x0 = Math.floor(x - h + 0.000001);
      var x1 = Math.floor(x + h - 0.000001);
      var y0 = Math.floor(y - h + 0.000001);
      var y1 = Math.floor(y + h - 0.000001);
      for (var cy = y0; cy <= y1; cy++) {
        for (var cx = x0; cx <= x1; cx++) {
          if (danger[BM.key(cx, cy)]) return true;
        }
      }
      return false;
    }

    humanTarget(world) {
      for (var i = 0; i < world.players.length; i++) {
        var p = world.players[i];
        if (!p.isCPU && p.alive && p.lives > 0) return p;
      }
      return null;
    }

    adjacentSoft(cell, world) {
      for (var i = 0; i < BM.DIRS.length; i++) {
        var d = BM.DIRS[i];
        if (world.map.isSoft(cell.x + d.x, cell.y + d.y)) return true;
      }
      return false;
    }

    dangerMap(world, extraBomb) {
      var danger = {};
      var self = this;

      function markBlast(cx, cy, range) {
        danger[BM.key(cx, cy)] = true;
        for (var i = 0; i < BM.DIRS.length; i++) {
          var d = BM.DIRS[i];
          for (var step = 1; step <= range; step++) {
            var tx = cx + d.x * step;
            var ty = cy + d.y * step;
            var cell = world.map.cell(tx, ty);
            if (cell === BM.CELL.HARD) break;
            danger[BM.key(tx, ty)] = true;
            if (cell === BM.CELL.SOFT) break;
            if (world.bombAt(tx, ty)) break;
          }
        }
      }

      for (var i = 0; i < world.bombs.length; i++) {
        var bomb = world.bombs[i];
        if (bomb.active) markBlast(bomb.cx, bomb.cy, bomb.range);
      }

      for (var ex of world.explosions.values()) {
        danger[BM.key(ex.cx, ex.cy)] = true;
      }

      if (extraBomb) markBlast(extraBomb.cx, extraBomb.cy, extraBomb.range);

      return danger;
    }

    escapeExists(player, world, cell) {
      var maxSteps = Math.max(1, Math.floor(C.BOMB_FUSE * player.speed * 0.7));
      var existing = this.dangerMap(world);
      var all = this.dangerMap(world, {
        cx: cell.x,
        cy: cell.y,
        range: player.range
      });
      var extra = {};
      for (var k in all) {
        if (all[k] && !existing[k]) extra[k] = true;
      }
      return this.escapeBfs(cell, world, existing, extra, all, maxSteps);
    }

    escapeBfs(from, world, existingDanger, extraDanger, allDanger, maxSteps) {
      var startKey = BM.key(from.x, from.y);
      var queue = [{ x: from.x, y: from.y, depth: 0 }];
      var seen = {};
      seen[startKey] = true;
      var head = 0;

      while (head < queue.length) {
        var cur = queue[head++];
        if (cur.depth >= maxSteps) continue;

        for (var i = 0; i < BM.DIRS.length; i++) {
          var d = BM.DIRS[i];
          var nx = cur.x + d.x;
          var ny = cur.y + d.y;
          var k = BM.key(nx, ny);
          if (seen[k]) continue;
          if (world.map.cell(nx, ny) !== BM.CELL.EMPTY) continue;
          if (world.bombAt(nx, ny)) continue;
          if (existingDanger[k]) continue;
          seen[k] = true;
          if (!allDanger[k]) return true;
          if (extraDanger[k]) {
            queue.push({ x: nx, y: ny, depth: cur.depth + 1 });
          }
        }
      }

      return false;
    }

    stepToward(from, world, entity, goalFn, danger, maxDepth, allowDangerFallback) {
      if (!entity) return null;

      var step = this.bfs(from, world, goalFn, danger, false, maxDepth);
      if (step) return step;
      if (allowDangerFallback === false) return null;

      return this.bfs(from, world, goalFn, danger, true, maxDepth);
    }

    bfs(from, world, goalFn, danger, allowDanger, maxDepth) {
      var startKey = BM.key(from.x, from.y);
      var queue = [{ x: from.x, y: from.y, first: null, depth: 0 }];
      var seen = {};
      seen[startKey] = true;
      var head = 0;

      while (head < queue.length) {
        var cur = queue[head++];
        if (cur.depth >= maxDepth) continue;

        for (var i = 0; i < BM.DIRS.length; i++) {
          var d = BM.DIRS[i];
          var nx = cur.x + d.x;
          var ny = cur.y + d.y;
          var k = BM.key(nx, ny);

          if (seen[k]) continue;
          if (world.map.cell(nx, ny) !== BM.CELL.EMPTY) continue;
          if (world.bombAt(nx, ny)) continue;
          if (!allowDanger && danger && danger[k]) continue;

          seen[k] = true;
          var first = cur.first || d;

          if (goalFn({ x: nx, y: ny })) return first;

          queue.push({ x: nx, y: ny, first: first, depth: cur.depth + 1 });
        }
      }

      return null;
    }

    wander(cell, world, danger) {
      var safe = [];
      var free = [];

      for (var i = 0; i < BM.DIRS.length; i++) {
        var d = BM.DIRS[i];
        var nx = cell.x + d.x;
        var ny = cell.y + d.y;
        if (world.map.cell(nx, ny) !== BM.CELL.EMPTY) continue;
        if (world.bombAt(nx, ny)) continue;
        free.push(d);
        if (!danger[BM.key(nx, ny)]) safe.push(d);
      }

      if (safe.length) return BM.choice(safe);
      return { x: 0, y: 0 };
    }
  }

  BM.CPUAI = CPUAI;
})();
