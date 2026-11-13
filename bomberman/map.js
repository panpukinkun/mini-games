(function () {
  var BM = window.BM = window.BM || {};

  var EMPTY = 0;
  var HARD = 1;
  var SOFT = 2;

  BM.CELL = { EMPTY: EMPTY, HARD: HARD, SOFT: SOFT };

  function MapManager() {
    var C = BM.CONFIG;
    this.cols = C.COLS;
    this.rows = C.ROWS;
    this.grid = [];
    this.version = 0;
    this.generate();
  }

  MapManager.prototype.generate = function (softChance) {
    var C = BM.CONFIG;
    this.version = (this.version || 0) + 1;
    var chance = typeof softChance === 'number' ? softChance : C.SOFT_CHANCE;
    var cols = this.cols;
    var rows = this.rows;
    var x;
    var y;

    this.grid = [];
    for (y = 0; y < rows; y++) {
      var row = [];
      for (x = 0; x < cols; x++) {
        var border = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
        var pillar = x % 2 === 0 && y % 2 === 0;
        row.push(border || pillar ? HARD : EMPTY);
      }
      this.grid.push(row);
    }

    var safe = {};
    for (var i = 0; i < C.SPAWNS.length; i++) {
      var sp = C.SPAWNS[i];
      for (var oy = -1; oy <= 1; oy++) {
        for (var ox = -1; ox <= 1; ox++) {
          safe[BM.key(sp.x + ox, sp.y + oy)] = true;
        }
      }
    }

    var softCount = 0;
    for (y = 1; y < rows - 1; y++) {
      for (x = 1; x < cols - 1; x++) {
        if (this.grid[y][x] !== EMPTY) continue;
        if (safe[BM.key(x, y)]) continue;
        if (Math.random() < chance) {
          this.grid[y][x] = SOFT;
          softCount++;
        }
      }
    }

    if (softCount < 10) {
      var candidates = [];
      for (y = 1; y < rows - 1; y++) {
        for (x = 1; x < cols - 1; x++) {
          if (this.grid[y][x] === EMPTY && !safe[BM.key(x, y)]) {
            candidates.push({ x: x, y: y });
          }
        }
      }
      while (softCount < 10 && candidates.length) {
        var pick = candidates.splice(BM.randInt(0, candidates.length - 1), 1)[0];
        this.grid[pick.y][pick.x] = SOFT;
        softCount++;
      }
    }
  };

  MapManager.prototype.cell = function (x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return HARD;
    return this.grid[y][x];
  };

  MapManager.prototype.isSolid = function (x, y) {
    return this.cell(x, y) !== EMPTY;
  };

  MapManager.prototype.isSoft = function (x, y) {
    return this.cell(x, y) === SOFT;
  };

  MapManager.prototype.destroySoft = function (x, y) {
    if (this.cell(x, y) !== SOFT) return false;
    this.grid[y][x] = EMPTY;
    this.version = (this.version || 0) + 1;
    return true;
  };

  MapManager.prototype.countSoft = function () {
    var n = 0;
    for (var y = 0; y < this.rows; y++) {
      for (var x = 0; x < this.cols; x++) {
        if (this.grid[y][x] === SOFT) n++;
      }
    }
    return n;
  };

  BM.MapManager = MapManager;
})();
