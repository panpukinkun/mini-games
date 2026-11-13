#!/usr/bin/env node
'use strict';
/**
 * stage_check.js — ステージモードの生成・到達性・クリア条件をまとめて検証する。
 *
 * usage: node tools/stage_check.js [maps]
 */
global.window = {};
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const dir = path.join(__dirname, '..');
for (const f of ['config.js', 'core.js', 'map.js', 'entities.js', 'cpu.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(dir, f), 'utf8'), { filename: f });
}
const BM = window.BM;
const C = BM.CONFIG;
const RUNS = Number(process.argv[2] || 300);
const input = {
  getDirection: () => ({ x: 0, y: 0 }),
  takeBomb: () => false,
  getTapDirection: () => ({ x: 0, y: 0 }),
  consumeTap() {}
};

function reachable(map, sx, sy) {
  const q = [{ x: sx, y: sy }];
  const seen = new Set([sx + ',' + sy]);
  for (let i = 0; i < q.length; i++) {
    for (const d of BM.DIRS) {
      const x = q[i].x + d.x;
      const y = q[i].y + d.y;
      const k = x + ',' + y;
      if (x < 0 || y < 0 || x >= map.cols || y >= map.rows || seen.has(k)) continue;
      if (map.cell(x, y) === BM.CELL.HARD) continue;
      seen.add(k);
      q.push({ x, y });
    }
  }
  return seen;
}

let unreachable = 0;
let noExit = 0;
for (let i = 0; i < RUNS; i++) {
  const stage = 1 + (i % BM.STAGE_COUNT);
  const w = new BM.World('normal', { mode: 'stage', stage });
  const seen = reachable(w.map, C.SPAWNS[0].x, C.SPAWNS[0].y);
  if (!w.exit) {
    noExit++;
    continue;
  }
  if (!seen.has(w.exit.x + ',' + w.exit.y)) unreachable++;
  for (const e of w.enemies) {
    if (!seen.has(e.tileX + ',' + e.tileY)) unreachable++;
  }
}

const w = new BM.World('normal', { mode: 'stage', stage: 1 });
w.exit.revealed = true;
w.enemies.forEach(e => { e.alive = false; });
const h = w.players[0];
h.tileX = w.exit.x;
h.tileY = w.exit.y;
h.x = w.exit.x + 0.5;
h.y = w.exit.y + 0.5;
w.checkOutcome();
if (w.outcome !== 'win') noExit++;

const carry = new BM.World('normal', {
  mode: 'stage',
  stage: 2,
  carry: { range: 2, maxBombs: 3, speed: 4.4, lives: 2 },
  carryPower: true
});
const carried = carry.players[0];
const carryOk = carried.range === 2 && carried.maxBombs === 3 && carried.speed === 4.4 && carried.lives === 2;

console.log(JSON.stringify({ maps: RUNS, unreachable, noExit, carryOk }, null, 2));
if (unreachable || noExit || !carryOk) process.exit(1);
console.log('STAGE_CHECK_OK');
