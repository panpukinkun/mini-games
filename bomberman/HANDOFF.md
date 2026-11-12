# ボンバーマン — HANDOFF（続きから始める人へ）

## ゴールと公開方針
既存サイト「パンプキンくんの遊び部屋」で動く、クラシック・ボンバーマン風の対戦ゲーム。
ゼロビルド・分割JS。これまでと同じ「URLを知っている人だけが遊ぶ」限定公開。

## 現在の状態（2026-11-12）
**クラシック風リニューアルを本番公開済み。CLI/ヘッドレス検証合格、実機スマホ確認待ち。**

- 本番URL: `https://panpukinkun.github.io/mini-games/bomberman/`
- 公開コミット: `c3ad3c7 fix(bomberman): 十字キーの過剰移動を修正`
- GitHub Pages: `built` / 本番 `index.html` はローカルとSHA256一致
- 本番URLをChromiumヘッドレスで再操作し、READY/GO・難易度hard・古典HUD・移動・爆弾・ポーズ・モバイルパッド（スライド/タップ）・横向き・ハブQRまで合格

- 人間: グリッド中心移動（1マス単位、停止時に中心へスナップ）
- 入力: タップは1マス、長押しは連続移動。移動中のターンバッファ（0.35秒）
- タップ余韻の再消費を防止（1回のタップで2マス以上動かない）
- タップは使用時に消費し、長押しの離しはタップ扱いにしない
- D-pad: 単一サーフェス化。スライドで方向変更、中央デッドゾーン、方向ハイライト
- 逆方向入力は即時反転（グリッド線上を維持）
- CPU: AIの安定性を優先して滑らかな移動を維持（人間だけグリッド）
- HUD: `TIME / LIVES / SCORE / ROUND / FIRE / BOMB / SPEED / CPU` の古典構成
- 流れ: タイトル → 難易度選択 → READY → GO → 対戦 → ラウンド結果 → 最終結果
- ルール: 3本勝負（2本先取）、各ラウンドは難易度別ライフ、時間切れは引き分け
- スコア: 軟ブロック破壊 +10、アイテム取得 +50（ラウンド合計を保持）
- グラフィック: チビ・ボンバーマン風スプライト、十字火炎、レンガ+パンプキン面、岩ブロック、緑の床
- 画面揺れ（スクリーンシェイク）は**撤去**（爆発は光・パーティクルのみ）
- ラウンド終了時のスコア二重表示を修正（ラウンドスコアを合算後に0へ）
- 難易度: やさしい / ふつう / むずかしい（保存）

## 操作性改善（D-pad）
- 4つの別ボタン＋`setPointerCapture` をやめ、D-pad全体でポインターを処理
- 指を滑らせて「左→上」などに方向変更可能
- 中央デッドゾーンで誤入力を防止
- スライド中の方向をハイライト
- 交差点手前のタップを取りこぼさないよう、移動中は0.35秒のターンバッファ
- 逆方向は即時反転（前のタイル中心へ戻る）
- 移動＋爆弾のマルチタッチ維持
- 画面揺れなし（目に厳しい演出を撤去）
- タップは使用時に消費。長押しの離しはタップ扱いにしない（過剰移動防止）
- 中央デッドゾーンに入ったらタップ余韻も破棄
- `getBoundingClientRect` をポインター開始時にキャッシュし、移動中のレイアウト読み取りを削減

## 主なファイル
```
bomberman/
  index.html   クラシックHUD・仮想パッド・難易度・オーバーレイ
  config.js    CONFIG + DIFFICULTY
  core.js      GameLoop / InputHandler（タップバッファ）
  map.js       MapManager
  entities.js  Player（人間グリッド移動/CPU滑らか移動）/ Bomb / World / score
  cpu.js       危険回避BFS・脱出・接近・アイテム回収
  audio.js     WebAudio合成音・unlock・suspended復帰・noiseキャッシュ
  ui.js        HUD（TIME/LIVES/SCORE/ROUND/POWER/CPU）・パッド・難易度
  game.js      READY/GO・3本勝負・状態機械・スプライト/十字火炎・描画
  tools/       sim / debug / playtest / longrun / dom_smoke / README
  docs/session 会話全文・設計・計画（raw/transcriptは非公開）
```

## 検証結果（CLI/ヘッドレス）
- `node --check` 全JS合格
- `python3 .opencode/tools/verify_all.py` → 0エラー
- `node tools/dom_smoke.js` → `DOM_SMOKE_OK`（hard選択・READY・HUD）
- `node tools/sim.js 30 normal 4242` → ドロー0・早期自滅0
- `node tools/playtest.js 15 normal 11` → 15勝0敗（勝利可能）
- `node tools/longrun.js 120 normal 2026` → 上限内（リークなし）
- Chromiumヘッドレス（ローカル）
  - READY→GO、難易度hard反映、古典HUD、グリッド停止、爆弾、ポーズ/再開、ミュート
  - D-pad: 中央デッドゾーン、右入力、左→上スライド、クイックタップ1マス、💣同時操作
  - 入力単体テスト: ターンバッファ、即時反転
  - D-pad挙動: クイックタップ1マス停止、長押し→離して停止、同方向タップで追加移動なし、垂直タップで1マス曲がる、逆タップで反転停止、中央デッドゾーン停止、左→上スライド
  - スコア二重表示なし（ラウンド合算後にHUD/最終結果を確認）
  - 本番の全JSがローカルとSHA256一致（同一コードを検証）
  - ラウンド1クリア→ラウンド2→最終結果→再スタート
  - モバイル（390×844）: パッド、HUDパワー、タップ移動、💣
  - 横向き（844×390）: オーバーレイ収容/スクロール、開始
  - 320×568: パッド、横溢れなし、開始
  - ハブ: カード・QR・リンク
  - コンソール/ページエラー0（ヘッドレス音声デバイス警告のみ除外）
- `file://` 直開きで起動・プレイ可能
- スクリーンショット確認: `/tmp/bm-desktop.png`, `/tmp/bm-mobile-new.png`, `/tmp/bm-explosion.png`

## 未確認（実機で確認）
- iPhone/Android実機の音声・safe-area・タッチ感
- WebKit/Safari実機（この環境のWebKitヘッドレスは起動が固まるため未実施）
- CPUの滑らか移動をグリッド化するかは、実機の操作感を見て判断

## 次にやること
1. スマホ実機で音・タッチ・safe-areaを確認
2. 問題があれば修正して再公開
3. 問題なければ完了

## よく使うコマンド
```bash
cd ~/Documents/OpenCode/bomberman
node tools/sim.js 30 normal 4242
node tools/playtest.js 15 normal 11
node tools/longrun.js 120 normal 2026
node tools/dom_smoke.js

cd ~/Documents/OpenCode
python3 .opencode/tools/verify_all.py
PYTHONUNBUFFERED=1 python3 .opencode/tools/serve.py .
```

> 元セッション: `ses_e3bb51f2fffeXixIkAiZOeISHV`（作業ディレクトリ記録は `.opencode` だったが実体は `bomberman/`）。
> 会話全文は `docs/session/transcript.md`、設計図は `docs/session/design-blueprint.md`、確定計画は `docs/session/implementation-plan.md`。
