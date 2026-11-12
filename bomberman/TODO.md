# ボンバーマン — TODO（引き継ぎ）

[x] Phase 1: config.js / core.js（ループ・入力・衝突基盤）
[x] Phase 2: map.js / entities.js（盤面・移動・爆弾・爆風・アイテム）
[x] Phase 3: cpu.js（3体AI・危険回避・脱出判定）
[x] Phase 3.5: CPU自滅・膠着の修正
[x] Phase 4: audio.js / ui.js / game.js / index.html
[x] Phase 5: ハブ index.html へカード・QR・GAMES・フッター追加
[x] Phase 5.5: 難易度選択（やさしい／ふつう／むずかしい）
[x] Phase 5.6: 最適化（背景/タイル/爆風/音/BFS）
[x] Phase 6a: 自動検証（node --check / verify_all / dom_smoke / sim / playtest / longrun）
[x] Phase 6b: Chromium（PC/モバイル/横向き/320px/難易度/file://）
[x] Phase 6c: クラシック化（グリッド移動・タップバッファ・古典HUD・READY/GO・3本勝負・スコア・スプライト・十字火炎）
[ ] Phase 6d: iPhone/Android実機の音声・safe-area・タッチ確認 — 公開後
[x] Phase 6e: D-pad単一サーフェス化・スライド・デッドゾーン・ターンバッファ・即時反転
[x] Phase 7: クラシック版を本番反映・Pagesビルド・本番URL確認 — 完了（b2b9640）

## 手動確認チェックリスト
- [ ] PC: 矢印/WASD＋Space、P/Escポーズ、Mミュートで1試合完走
- [ ] スマホ: 十字＋💣、48px以上、スクロール/ズーム無効、safe-area
- [ ] 初回タップで音が鳴る（iOS/Android）
- [ ] READY→GO→ラウンド→最終結果→もういちど
- [ ] ハブのカード・QR・リンクから起動
- [ ] コンソールエラー0件
