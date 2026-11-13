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
[x] Phase 6c: クラシック化（グリッド移動・タップバッファ・古典HUD・READY/GO・スコア・スプライト・十字火炎）
[x] Phase 6d: 画面揺れ撤去、スコア二重表示修正
[x] Phase 6e: D-pad単一サーフェス化・スライド・デッドゾーン・ターンバッファ・即時反転
[x] Phase 6f: タップ1マス/長押し連続の分離、タップ余韻の再消費防止
[x] Phase 6g: iPadズーム防止（touch-action / gesture / dblclick / visualViewport / リセット）
[x] Phase 6h: 自キャラの丸削除、CPUサングラス
[x] Phase 6i: ステージモード（5面・敵・隠し出口・ライフ・時間・スコア）
[x] Phase 6j: パワーアップのステージ間引き継ぎ（ON/OFF）
[x] Phase 6k: モード選択（ステージ/たいせん）、CPU人数1〜3
[x] Phase 6l: HUD/勝敗表示（STAGE/ENEMY、STAGE CLEAR、ALL CLEAR、GAME OVER）
[x] Phase 6m: ステージ到達性・出口・引き継ぎ・クリア条件の検証
[x] Phase 6o: ミックスモード（CPU1〜3＋モンスター）、モンスター壁抜け廃止
[x] Phase 6p: CPU/ENEMY合計表示、盤面キャッシュ・影撤去による高速化
[ ] Phase 6n: iPad実機でズーム・爆弾・画面復帰を確認 — 公開済み・確認待ち
[x] Phase 7: 全修正後に一度だけビルド・Pages・本番URL確認 — 完了（54b99f3）

## 手動確認チェックリスト
- [ ] iPad: D-padダブルタップでズームしない
- [ ] iPad: ズーム後も爆弾が置ける／画面を戻せる
- [ ] ステージ: 敵全滅→出口→つぎのステージ
- [ ] パワーアップ引き継ぎON/OFF
- [ ] たいせん: CPU 1/2/3、ラウンド→最終結果
- [ ] STAGE CLEARで「もういちど」が出ない
- [ ] ALL CLEAR / GAME OVER の文言
- [ ] PC/スマホ/タブレットの操作・音・safe-area
- [ ] コンソールエラー0件
