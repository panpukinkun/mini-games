#!/usr/bin/env node
'use strict';
/**
 * playtest.js — 簡易ヒューマンボットで「勝てるか」を検証する。
 * プレイヤー0をCPU AIで操作し、ターゲットをCPU側に差し替える。
 *
 * usage: node tools/playtest.js [runs] [difficulty] [baseSeed]
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
const RUNS = Number(process.argv[2] || 30);
const DIFF = process.argv[3] || 'normal';
const BASE = Number(process.argv[4] || 7);

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const outcomes = { win: 0, lose: 0, draw: 0 };
let totalSec = 0;
let minSec = Infinity;
let maxSec = 0;
let errors = 0;

for (let run = 0; run < RUNS; run++) {
  Math.random = mulberry32(BASE + run * 9973);
  try {
    const world = new BM.World(DIFF);
    const human = world.players[0];
    const ai = new BM.CPUAI();
    ai.humanTarget = function (w) {
      let best = null;
      let bestDist = Infinity;
      for (let i = 1; i < w.players.length; i++) {
        const p = w.players[i];
        if (!p.alive || p.lives <= 0) continue;
        const d = Math.abs(Math.floor(p.x) - Math.floor(human.x)) + Math.abs(Math.floor(p.y) - Math.floor(human.y));
        if (d < bestDist) { bestDist = d; best = p; }
      }
      return best;
    };
    human.ai = ai;
    human.isCPU = true;

    const input = { getDirection: () => ({ x: 0, y: 0 }), takeBomb: () => false };
    let frames = 0;
    while (!world.outcome && frames < 60 * 185) {
      world.update(1 / 60, input);
      frames++;
    }
    const outcome = world.outcome || 'draw';
    outcomes[outcome] = (outcomes[outcome] || 0) + 1;
    totalSec += world.elapsed;
    minSec = Math.min(minSec, world.elapsed);
    maxSec = Math.max(maxSec, world.elapsed);
  } catch (e) {
    errors++;
    console.error('run', run, 'error:', e.message);
  }
}

console.log(JSON.stringify({
  difficulty: DIFF,
  runs: RUNS,
  outcomes: outcomes,
  errors: errors,
  avgSec: +(totalSec / RUNS).toFixed(1),
  minSec: +minSec.toFixed(1),
  maxSec: +maxSec.toFixed(1)
}, null, 2));

if (errors > 0 || outcomes.win === 0) process.exit(1);
