# ボンバーマン — HANDOFF（続きから始める人へ）

## ゴールと公開方針
既存サイト「パンプキンくんの遊び部屋」で動く、ブラウザベースのボンバーマン風ゲーム。
ゼロビルド・分割JS（ビルドなしで `file://` と GitHub Pages 両対応）。
これまでと同じ「URLを知っている人だけが遊ぶ」限定公開の運用。検索避けの追加はしない。

## 実装状況（2026-11-12）
**Phase 1〜5＋難易度選択＋最適化まで完了。自動検証・Chromium実ブラウザ検証・本番反映後のヘッドレス検証まで合格。**
残りは実機スマホでの最終確認のみ。

- 本番URL: `https://panpukinkun.github.io/mini-games/bomberman/`
- 公開コミット: `324d339 feat(bomberman): ボムボムパンプキンを追加`
- GitHub Pages: `built` / 本番 `index.html` はローカルとSHA256一致
- 公開方針: これまでと同じ「URLを知っている人だけが遊ぶ」限定公開（noindex/robots.txtは追加しない）

```
bomberman/
  index.html   DOMシェル・CSS・HUD・仮想パッド・難易度選択・オーバーレイ
  config.js    CONFIG ＋ DIFFICULTY（easy/normal/hard）
  core.js      GameLoop(Delta 0.05sクランプ), InputHandler, ストレージ
  map.js       MapManager（市松生成・軟ブロック破壊・アイテム配置）
  entities.js  Player(diff対応) / Bomb(placer) / Explosion / World(diff)
  cpu.js       危険回避BFS・脱出・接近・アイテム回収・難易度別判断
  audio.js     WebAudio合成音・初回unlock・suspended復帰・noiseキャッシュ
  ui.js        HUD・仮想パッド・難易度ボタン・タイトル/ポーズ/リザルト
  game.js      状態マシン・DPR描画・スプライトキャッシュ・背景/爆風キャッシュ
  tools/       sim / debug / playtest / longrun / dom_smoke / README
  docs/session 会話全文・設計図・確定計画・raw.jsonl（rawとtranscriptは非公開）
```

## 難易度

| 難易度 | ライフ | プレイヤー速度 | CPU速度 | 爆弾を置く確率 | 判断間隔 | アイテム回収 |
|---|---|---|---|---|---|---|
| やさしい | 4 | 3.9 | 2.15 | 42% | 0.16–0.30s | なし |
| ふつう | 3 | 3.7 | 2.9 | 65% | 0.08–0.17s | あり |
| むずかしい | 2 | 3.7 | 3.25 | 82% | 0.05–0.12s | あり |

- タイトル画面で選択、`localStorage` に保存（`bm_difficulty`）
- 選択内容は `World` → `Player` / `CPUAI` に反映

## 主な修正（今回）
1. **safe-areaの二重適用**を解消（`#app` の下余白を0にし、`#pad` 側で処理）
2. **横向きのオーバーレイ見切れ**を修正（`#ovCard` に max-height/overflow、横向き用の縮小CSS）
3. **CPUのpanic時に危険方向へランダム移動**していたのを、安全な徘徊方向に修正
4. **バックグラウンド復帰後の音声**が復帰しない可能性を修正（`play()` / `setMuted()` で `resume()`）
5. **アプリ切替時にポーズ**（`window.blur` を追加）
6. **CPUのアイテム回収**を追加（ふつう/むずかしいのみ）
7. **爆弾の設置数が戻らない膠着バグ**（`Bomb.placer` 分離）は前回修正済み
8. **爆弾設置判断**は「自分の新爆弾の爆風は通過可、既存爆弾の爆風は不可」に分離済み

## 最適化
- 背景グラデーションをリサイズ時のみ生成してキャッシュ
- 床・硬ブロック・軟ブロックをタイルスプライト化（毎フレームのパス描画を `drawImage` に）
- アイテム発光と爆風をスプライト化（`shadowBlur` / グラデーション生成を削減）
- 爆発ノイズバッファをキャッシュ
- CPUのBFSを `queue.shift()` からインデックス方式へ
- HUDは値が変わったときだけDOM更新（既存）

## 検証結果（自動・実ブラウザ）
- `node --check` 全JS合格
- `python3 .opencode/tools/verify_all.py` → **0エラー**
- `node tools/dom_smoke.js` → `DOM_SMOKE_OK`（hard選択・ライフ2・CPU速度3.25を確認）
- `node tools/sim.js 40 <diff> 4242`（easy/normal/hard）
  - 早期自滅（5秒以内のCPU全滅）**0**、180秒ドロー**0**
  - 平均決着: easy 69.0s / normal 58.1s / hard 46.5s（※人間idleのため負けが多いのは想定内）
- `node tools/playtest.js 30 <diff> 11`（簡易ヒューマンボット）
  - easy: 30勝0敗 / normal: 29勝1敗 / hard: 24勝4敗2分
  - **勝利可能**であることを確認
- `node tools/longrun.js 120 normal 2026` → 爆弾4、パーティクル94、アイテム3、爆風14、イベント0で上限内
- マップ連結性: 1000マップで全スポーン到達可能（不一致0）
- Chromium実ブラウザ（headless）
  - PC 1280×800: 難易度選択（hard反映）・開始・移動・爆弾・爆発・ポーズ/再開・ミュート
  - モバイル 390×844: 仮想パッド・十字移動・💣・HUD溢れなし
  - 横向き 844×390: オーバーレイが収まる/スクロール可・開始可能
  - 320×568: パッド表示・横溢れなし・開始可能
  - ハブ: カード・QR・`bomberman/`リンク
  - コンソール/ページエラー0（ヘッドレス音声デバイス警告のみ除外）
- `file://` 直開きで起動・プレイ可能

## 本番反映後のCLI/ヘッドレス検証（合格）
- `https://panpukinkun.github.io/mini-games/bomberman/` → HTTP 200
- `bomberman/game.js` / `config.js` → HTTP 200
- 本番 `bomberman/index.html` のSHA256がローカルと一致
- ハブ本番ページに「ボムボムパンプキン」カード・`bomberman/`リンク・QRを確認
- 本番をChromiumで操作:
  - PC: 難易度hard選択→開始（ライフ2/CPU速度3.25）、移動、爆弾、ポーズ/再開
  - モバイル: 仮想パッド表示、十字移動、💣、横溢れなし
  - 横向き: オーバーレイが収まる/スクロール可、開始可能
  - コンソール/ページエラー0

## 未確認（実機で確認）
- iPhone/Android実機の**実際の音声出力**（WebKitヘッドレスはこの環境で起動が固まるため未実施）
- iPhoneのsafe-area（ノッチ/ホームバー）での見た目
- 実機での操作感・端末固有の描画

## 次にやること
1. スマホでQR/URLから起動し、音・タッチ・ポーズ・リトライを確認
2. 問題があれば修正して再公開
3. 問題なければ完了

## よく使うコマンド
```bash
cd ~/Documents/OpenCode/bomberman
node tools/sim.js 40 normal 4242
node tools/debug.js 6 normal
node tools/playtest.js 30 normal 11
node tools/longrun.js 120 normal 2026
node tools/dom_smoke.js

cd ~/Documents/OpenCode
python3 .opencode/tools/verify_all.py
PYTHONUNBUFFERED=1 python3 .opencode/tools/serve.py .
```

> 元セッション: `ses_e3bb51f2fffeXixIkAiZOeISHV`（作業ディレクトリ記録は `.opencode` だったが実体は `bomberman/`）。
> 会話全文は `docs/session/transcript.md`、設計図は `docs/session/design-blueprint.md`、確定計画は `docs/session/implementation-plan.md`。
