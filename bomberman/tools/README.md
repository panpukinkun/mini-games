# 開発用ヘッドレスツール

ゲーム本体は `config/core/map/entities/cpu.js` などブラウザ用JSのみで動作します。
このフォルダのスクリプトは Node でロジックを検証するためのもので、ブラウザには読み込みません。

```bash
node tools/sim.js [runs] [difficulty] [seed]
# 例: node tools/sim.js 60 normal 12345
# 自動対戦の結果をJSONで出力（difficulty: easy / normal / hard）

node tools/debug.js [runs] [difficulty]
# CPUの死亡時刻・位置・周辺盤面をトレース

node tools/playtest.js [runs] [difficulty] [baseSeed]
# プレイヤー0を簡易ボットで操作し、勝利可能かを検証

node tools/longrun.js [seconds] [difficulty] [seed]
# 長時間実行して、爆弾・パーティクル・アイテム・爆風・イベントの増加を確認

node tools/stage_check.js [maps]
# ステージ生成の到達性・出口・敵・クリア条件・パワーアップ引き継ぎを検証
```

要因調査時は `debug.js` のトレースと死亡グリッドを確認してください。
`playtest.js` は「勝てるゲームか」の回帰確認、`longrun.js` はメモリ/配列リークの確認に使います。
