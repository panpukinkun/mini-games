'use strict';
global.window = {};
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const dir = path.join(__dirname, '..');
for (const f of ['config.js', 'core.js', 'map.js', 'entities.js', 'cpu.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(dir, f), 'utf8'), { filename: f });
}
const BM = window.BM;
const RUNS = Number(process.argv[2] || 12);
const DIFF = process.argv[3] || 'normal';
const SEED = Number(process.argv[4] || 12345);
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
Math.random = mulberry32(SEED);
let results = [];
for (let run = 0; run < RUNS; run++) {
  const world = new BM.World(DIFF);
  const input = { getDirection: () => ({ x: 0, y: 0 }), takeBomb: () => false };
  let frames = 0;
  while (!world.outcome && frames < 60 * 185) {
    world.update(1 / 60, input);
    frames++;
  }
  results.push({
    outcome: world.outcome,
    sec: Math.round(world.elapsed),
    softLeft: world.map.countSoft(),
    items: world.items.size,
    bombs: world.bombs.length,
    lives: world.players.map(p => p.lives),
    stats: world.players.map(p => p.range + '/' + p.maxBombs + '/' + p.speed.toFixed(2)),
    particles: world.particles.length
  });
}
console.log(JSON.stringify(results, null, 2));
