(function () {
  var BM = window.BM = window.BM || {};

  BM.CONFIG = {
    COLS: 13,
    ROWS: 11,

    BOMB_FUSE: 2.6,
    EXPLOSION_TIME: 0.42,
    ITEM_SPAWN_DELAY: 0.5,

    PLAYER_SPEED: 3.7,
    CPU_SPEED: 2.9,
    SPEED_STEP: 0.42,
    MAX_SPEED: 6.2,

    START_BOMBS: 1,
    START_RANGE: 1,
    MAX_BOMBS: 6,
    MAX_RANGE: 8,

    SOFT_CHANCE: 0.62,
    ITEM_CHANCE: 0.34,
    ITEM_WEIGHTS: { fire: 0.38, bomb: 0.34, speed: 0.28 },
    ITEM_BY_WEIGHT: ['fire', 'bomb', 'speed'],

    PLAYER_LIVES: 3,
    INVULN_TIME: 2.0,
    RESPAWN_DELAY: 1.3,
    MATCH_TIME: 180,

    HITBOX: 0.70,
    PICKUP_HITBOX: 0.90,
    DAMAGE_HITBOX: 0.48,
    CORNER_ASSIST: 0.5,
    DELTA_MAX: 0.05,

    SHAKE_TIME: 0.35,
    SHAKE_POWER: 0.35,

    SPAWNS: [
      { x: 1, y: 9 },
      { x: 11, y: 1 },
      { x: 1, y: 1 },
      { x: 11, y: 9 }
    ],

    COLORS: {
      player: '#4a8cff',
      cpus: ['#ff6b6b', '#53d769', '#b06bff']
    },

    NAMES: ['あなた', 'あか', 'みどり', 'むらさき']
  };

  BM.DIFFICULTY = {
    easy: {
      key: 'easy',
      label: 'やさしい',
      desc: 'CPUはゆっくり。ライフ4。はじめて向け。',
      PLAYER_LIVES: 4,
      PLAYER_SPEED: 3.9,
      CPU_SPEED: 2.15,
      CPU_BOMB_CHANCE: 0.42,
      CPU_DECISION_MIN: 0.16,
      CPU_DECISION_MAX: 0.30,
      CPU_ITEM_PICKUP: false,
      MATCH_TIME: 180
    },
    normal: {
      key: 'normal',
      label: 'ふつう',
      desc: 'CPUはふつう。ライフ3。',
      PLAYER_LIVES: 3,
      PLAYER_SPEED: 3.7,
      CPU_SPEED: 2.9,
      CPU_BOMB_CHANCE: 0.65,
      CPU_DECISION_MIN: 0.08,
      CPU_DECISION_MAX: 0.17,
      CPU_ITEM_PICKUP: true,
      MATCH_TIME: 180
    },
    hard: {
      key: 'hard',
      label: 'むずかしい',
      desc: 'CPUは速く、よく爆弾を置く。ライフ2。',
      PLAYER_LIVES: 2,
      PLAYER_SPEED: 3.7,
      CPU_SPEED: 3.25,
      CPU_BOMB_CHANCE: 0.82,
      CPU_DECISION_MIN: 0.05,
      CPU_DECISION_MAX: 0.12,
      CPU_ITEM_PICKUP: true,
      MATCH_TIME: 180
    }
  };

  BM.DEFAULT_DIFFICULTY = 'normal';
})();
