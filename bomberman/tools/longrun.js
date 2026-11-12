#!/usr/bin/env node
'use strict';
/**
 * longrun.js — 長時間実行して、爆弾・パーティクル・アイテム・爆風・イベントが
 * 無制限に増えないことを確認する開発用スクリプト。
 *
 * usage: node tools/longrun.js [seconds] [difficulty] [seed]
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
const SECONDS = Number(process.argv[2] || 300);
const DIFF = process.argv[3] || 'normal';
const SEED = Number(process.argv[4] || 2026);

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
Math.random = mulberry32(SEED);

const world = new BM.World(DIFF);
for (const p of world.players) p.lives = 9999;
world.checkOutcome = function () { this.outcome = null; };
const input = { getDirection: () => ({ x: 0, y: 0 }), takeBomb: () => false };

const max = { bombs: 0, particles: 0, items: 0, explosions: 0, pendingItems: 0, events: 0 };
const frames = Math.floor(SECONDS * 60);
for (let f = 0; f < frames; f++) {
  world.update(1 / 60, input);
  world.outcome = null;
  world.events.length = 0;
  max.bombs = Math.max(max.bombs, world.bombs.length);
  max.particles = Math.max(max.particles, world.particles.length);
  max.items = Math.max(max.items, world.items.size);
  max.explosions = Math.max(max.explosions, world.explosions.size);
  max.pendingItems = Math.max(max.pendingItems, world.pendingItems.length);
  max.events = Math.max(max.events, world.events.length);
}

const limits = { bombs: 200, particles: 5000, items: 300, explosions: 300, pendingItems: 300, events: 0 };
const failures = [];
for (const k of Object.keys(limits)) {
  if (max[k] > limits[k]) failures.push(k + '=' + max[k] + ' > ' + limits[k]);
}
console.log(JSON.stringify({ seconds: SECONDS, difficulty: DIFF, max, limits, ok: failures.length === 0 }, null, 2));
if (failures.length) {
  console.error('LEAK/OVERRUN:', failures.join(', '));
  process.exit(1);
}
