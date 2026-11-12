'use strict';
global.window = {};
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..');
for (const f of ['config.js','core.js','map.js','entities.js','cpu.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(dir, f), 'utf8'), { filename: f });
}
const BM = window.BM;
const RUNS = Number(process.argv[2] || 6);
const DIFF = process.argv[3] || 'normal';
for (let run = 0; run < RUNS; run++) {
  const w = new BM.World(DIFF);
  const input = { getDirection: () => ({x:0,y:0}), takeBomb: () => false };
  const deaths = [];
  let prevLives = w.players.map(p => p.lives);
  const trace = [];
  for (let f = 0; f < 60 * 8 && !w.outcome; f++) {
    w.update(1 / 60, input);
    for (let i = 0; i < w.players.length; i++) {
      if (w.players[i].lives < prevLives[i]) {
        deaths.push({ t: +(f/60).toFixed(2), id: i, x: +w.players[i].x.toFixed(2), y: +w.players[i].y.toFixed(2) });
        prevLives[i] = w.players[i].lives;
      }
    }
    if (f % 30 === 0) {
      trace.push({ t: +(f/60).toFixed(1), cpus: w.players.slice(1).map(p => p.id + ':' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + (p.alive ? '' : 'X')).join(' '), bombs: w.bombs.length });
    }
  }
  console.log('RUN', run, 'outcome', w.outcome, 'soft', w.map.countSoft());
  console.log(' deaths', JSON.stringify(deaths));
  console.log(' trace', JSON.stringify(trace.slice(0, 6)));
  if (deaths.length) {
    const d = deaths[0];
    const g = w.map.grid;
    const r = Math.floor(d.y), c = Math.floor(d.x);
    console.log(' grid around death:');
    for (let y = Math.max(0, r-2); y <= Math.min(w.map.rows-1, r+2); y++) {
      let line = '';
      for (let x = Math.max(0, c-2); x <= Math.min(w.map.cols-1, c+2); x++) {
        line += g[y][x] === 1 ? '#' : g[y][x] === 2 ? 'S' : '.';
      }
      console.log('  ' + line);
    }
  }
}
