# ボンバーマン — TODO（引き継ぎ）

[x] Phase 1: config.js / core.js（ループ・入力・衝突基盤）— 実装済み
[x] Phase 2: map.js / entities.js（盤面・移動・爆弾・爆風・アイテム）— 実装済み
[x] Phase 3: cpu.js（3体AI・危険回避・脱出判定）— 実装済み
[x] Phase 3.5: CPU自滅・膠着の修正（placer/コーナー補正/当たり判定危険/中心寄せ/脱出ロック）— 完了
[x] Phase 4: audio.js / ui.js / game.js / index.html — 実装済み
[x] Phase 5: ハブ index.html へカード・QR・GAMES・フッター追加 — 完了
[x] Phase 5.5: 難易度選択（やさしい／ふつう／むずかしい） — 実装済み
[x] Phase 5.6: 最適化（背景/タイル/爆風/音/BFS） — 実装済み
[x] Phase 6a: 自動検証（node --check / verify_all / dom_smoke / sim / playtest / longrun）— 合格
[x] Phase 6b: Chromium実ブラウザ（PC/モバイル/横向き/320px/難易度/file://）— 合格
[ ] Phase 6c: iPhone/Android実機の音声・safe-area・タッチ確認 — 公開済み・確認待ち
[x] Phase 7: 本番反映・Pagesビルド・本番URL確認 — 完了（324d339）

## 手動確認チェックリスト
- [ ] PC: 矢印/WASD＋Space、P/Escポーズ、Mミュートで1試合完走
- [ ] スマホ: 十字＋💣、48px以上、スクロール/ズーム無効、safe-area
- [ ] 初回タップで音が鳴る（iOS/Android）
- [ ] ポーズ→再開、リザルト→もういちど、トップへ
- [ ] ハブのカード・QR・リンクから起動
- [ ] コンソールエラー0件
