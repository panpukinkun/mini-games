#!/usr/bin/env node
'use strict';
/**
 * dom_smoke.js — ブラウザ無しで index.html の主要DOMをスタブし、
 * game.js / ui.js / audio.js の初期化・数フレーム実行を検証する開発用スクリプト。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);

function classList() {
  const set = new Set();
  return {
    add: (...xs) => xs.forEach(x => set.add(x)),
    remove: (...xs) => xs.forEach(x => set.delete(x)),
    contains: x => set.has(x),
    toggle: (x, force) => {
      if (force === undefined) {
        if (set.has(x)) { set.delete(x); return false; }
        set.add(x); return true;
      }
      if (force) set.add(x); else set.delete(x);
      return !!force;
    }
  };
}

function makeEl(id) {
  const el = {
    id,
    style: {},
    classList: classList(),
    textContent: '',
    innerHTML: '',
    width: 0,
    height: 0,
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    getAttribute() { return null; },
    appendChild() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 390, height: 700, left: 0, top: 0 }; },
    setPointerCapture() {},
    releasePointerCapture() {}
  };
  return el;
}

const els = {};
for (const id of ids) els[id] = makeEl(id);

const dirEls = {
  up: makeEl('padUp'),
  left: makeEl('padLeft'),
  down: makeEl('padDown'),
  right: makeEl('padRight')
};
els.pad.querySelector = function (sel) {
  const m = String(sel).match(/data-dir="([^"]+)"/);
  return m ? dirEls[m[1]] || null : null;
};

const gradient = { addColorStop() {} };
const ctx = new Proxy({}, {
  get(target, prop) {
    if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => gradient;
    if (prop === 'measureText') return () => ({ width: 10 });
    if (prop in target) return target[prop];
    return function () {};
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  }
});
els.cv.getContext = () => ctx;

const doc = {
  readyState: 'complete',
  hidden: false,
  body: makeEl('body'),
  getElementById(id) {
    if (!els[id]) els[id] = makeEl(id);
    return els[id];
  },
  createElement(tag) {
    var el = makeEl(tag);
    if (tag === 'canvas') el.getContext = () => ctx;
    return el;
  },
  addEventListener() {},
  removeEventListener() {},
  querySelector() { return null; },
  querySelectorAll(sel) {
    if (sel === '.diff-btn') return diffButtons;
    return [];
  }
};

function diffEl(key) {
  var el = makeEl('diff-' + key);
  el.getAttribute = function (name) { return name === 'data-diff' ? key : null; };
  return el;
}
const diffButtons = [diffEl('easy'), diffEl('normal'), diffEl('hard')];

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.state = 'running';
    this.destination = {};
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createOscillator() {
    return {
      type: '',
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() { return this; },
      start() {}, stop() {}
    };
  }
  createGain() {
    return {
      gain: {
        value: 0,
        setValueAtTime() {},
        exponentialRampToValueAtTime() {},
        cancelScheduledValues() {},
        setTargetAtTime() {}
      },
      connect() { return this; }
    };
  }
  createBuffer(ch, len) { return { getChannelData() { return new Float32Array(len); } }; }
  createBufferSource() { return { buffer: null, connect() { return this; }, start() {} }; }
  createBiquadFilter() {
    return { type: '', frequency: { value: 0 }, connect() { return this; } };
  }
}

const store = {};
const sandbox = {
  console,
  Math,
  JSON,
  Date,
  setTimeout,
  clearTimeout,
  document: doc,
  localStorage: {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; }
  },
  devicePixelRatio: 1,
  innerWidth: 390,
  innerHeight: 844,
  AudioContext: FakeAudioContext,
  webkitAudioContext: FakeAudioContext,
  requestAnimationFrame() { return 1; },
  cancelAnimationFrame() {},
  addEventListener() {},
  removeEventListener() {},
  location: { href: '' },
  navigator: { maxTouchPoints: 0 },
  performance: { now: () => Date.now() }
};
sandbox.window = sandbox;
vm.createContext(sandbox);

const files = ['config.js', 'core.js', 'map.js', 'entities.js', 'cpu.js', 'audio.js', 'ui.js', 'game.js'];
for (const f of files) {
  const code = fs.readFileSync(path.join(root, f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
}

let game = sandbox.__BM_GAME__;
if (!game) game = new sandbox.BM.Game();

game.setMode('battle');
game.setDifficulty('hard');
game.start();
for (let i = 0; i < 600; i++) game.step(1 / 60);
game.togglePause();
game.step(1 / 60);
game.togglePause();
game.toggleMute();
game.toggleMute();
game.input.setPad('left', true);
game.input.pressBomb();
for (let i = 0; i < 120; i++) game.step(1 / 60);
game.input.setPad('left', false);

console.log('state:', game.state);
console.log('difficulty:', game.world.difficultyKey, game.world.diff.label);
console.log('human lives:', game.world.players[0].lives, 'cpu speed:', game.world.players[1].speed);
console.log('elapsed:', game.world.elapsed.toFixed(2));
console.log('outcome:', game.world.outcome);
console.log('players:', game.world.players.map(p => ({ id: p.id, lives: p.lives, alive: p.alive, x: +p.x.toFixed(2), y: +p.y.toFixed(2) })));
console.log('bombs:', game.world.bombs.length, 'items:', game.world.items.size);
console.log('overlay visible:', game.ui.isOverlayVisible());
if (game.world.difficultyKey !== 'hard' || game.world.players[0].lives !== 2) {
  throw new Error('difficulty selection failed');
}
console.log('DOM_SMOKE_OK');
