# ボンバーマン — HANDOFF（続きから始める人へ）

## ゴールと公開方針
「パンプキンくんの遊び部屋」のクラシック・ボンバーマン風ゲーム。
ゼロビルド・分割JS。URLを知っている人だけが遊ぶ限定公開（noindex等は追加しない）。

## 現在の状態（2026-11-12）
**ステージモード・たいせんモード・iPad向けズーム防止・敵の見分けを本番公開済み。iPad実機確認待ち。**

- 本番URL: `https://panpukinkun.github.io/mini-games/bomberman/`
- 公開コミット: `54b99f3 feat(bomberman): ミックスモードと描画最適化を追加`
- GitHub Pages: `built` / 本番の全JSがローカルとSHA256一致
- 本番URLをChromiumヘッドレスで再操作し、ステージHUD・移動・爆弾・ポーズ・モバイル・横向き・ハブQRまで合格
- 本番のCPU人数1/2/3、ミックス（CPU2＋モンスター5）、モンスターの壁抜けなしを確認

- ステージモード: 全5面、敵全滅→隠し出口→次ステージ
- たいせんモード: 1人 vs CPU 1〜3体、3本勝負
- ミックスモード: 1人 vs CPU 1〜3体＋モンスター。CPU全滅で勝利、モンスターは妨害
- パワーアップ: ステージ間で引き継ぎ（設定でOFF可）
- 難易度: やさしい／ふつう／むずかしい
- HUDのCPU/ENEMYは「残り/合計」表示（例: CPU 2/3、ENEMY 5/5）
- モンスターは壁・軟ブロック・爆弾をすり抜けない（ghost含む）

## ステージモード
- 各ステージ: 200秒、ライフ3（持ち越し）
- 敵: 3〜6体。歩く／追う／ブロックを抜けるゴースト
- 出口: 軟ブロックの下に隠されている。全敵撃破後に出口へ乗るとクリア
- パワーアップ: 火力・爆弾数・スピード。1ステージ1個を軟ブロック下に保証
- スコア: 軟ブロック+10、アイテム+50、敵撃破（100/200/400）、
  ステージクリア+500、残り時間×5
- 5面クリアで `ALL CLEAR`
- ライフ0で `GAME OVER` → `ステージ1から`

## たいせん／ミックスモード
- CPU人数: 1／2／3体から選択
- ミックスはCPUとモンスターが同時に登場
- 3本勝負（2本先取）
- 難易度別のCPU速度・爆弾設置確率・判断間隔
- 通常ラウンドクリアは `つぎのラウンド`、最終のみ `もういちど`

## パフォーマンス
- 盤面（床・硬ブロック・軟ブロック）をオフスクリーンCanvasへキャッシュ
- 軟ブロック破壊時のみ盤面キャッシュを再生成
- ボード枠の毎フレーム`shadowBlur`を撤去
- ワールド切替時にキャッシュを確実に再生成
- ヘッドレス計測（1280×800/DPR2、ミックス3CPU+5モンスター）: 約2.1ms/フレーム
- 本番でもCPU人数1/2/3、ミックスHUD、モンスターの壁抜けなしを確認
- 実機Macでの最終FPS確認は必要

## iPadズーム対策
- `#app` / `#stage` / `#pad` / `#dpad` / `#btnBomb` / HUD に `touch-action: none`
- オーバーレイのボタンは `touch-action: manipulation`
- `gesturestart` / `gesturechange` / `gestureend` を preventDefault
- 2本指 `touchstart` / `touchmove` を防止
- `dblclick` をゲーム画面・オーバーレイで防止
- `visualViewport.resize` でキャンバス再計算
- ズーム検知時のみ「画面をリセット」ボタンを表示（再読み込み）
- ※iPad実機での最終確認が必要

## 表示・操作
- 自キャラの白い丸は削除
- たいせんモードのCPUは**サングラス**で自キャラと区別
- ステージの敵は角のあるパンプキン型モンスター
- 画面揺れ（スクリーンシェイク）は撤去
- グリッド移動、タップ1マス／長押し連続、ターンバッファ、即時反転
- D-padは単一サーフェス。スライド・中央デッドゾーン・方向ハイライト
- HUD:
  - ステージ: `STAGE / ENEMY / TIME / SCORE / LIVES / FIRE / BOMB / SPEED`
  - たいせん: `ROUND / CPU / TIME / SCORE / LIVES / POWER`
- スコア二重表示なし（ラウンド加算後に0リセット）

## 主なファイル
```
bomberman/
  index.html   モード選択・HUD・D-pad・難易度・ズーム防止UI
  config.js    CONFIG / DIFFICULTY / ENEMY_TYPES / STAGES
  core.js      GameLoop / InputHandler（タップ・長押し分離）
  map.js       MapManager（軟ブロック確率指定）
  entities.js  Player / Enemy / Bomb / World（battle/stage）
  cpu.js       危険回避BFS・脱出・接近・アイテム回収
  audio.js     WebAudio合成音・unlock・suspended復帰・noiseキャッシュ
  ui.js        HUD・D-pad・モード/CPU人数/引き継ぎ/難易度
  game.js      ステージ/たいせんの状態機械・READY/GO・描画
  tools/       sim / debug / playtest / longrun / dom_smoke / stage_check / README
  docs/session 会話全文・設計・計画（raw/transcriptは非公開）
```

## 検証結果（CLI/ヘッドレス）
- `node --check` 全JS合格
- `python3 .opencode/tools/verify_all.py` → 0エラー
- `node tools/dom_smoke.js` → `DOM_SMOKE_OK`
- `node tools/stage_check.js 300` → 到達不能0・出口なし0・引き継ぎOK
- ステージ実プレイ検証:
  - 敵の移動・接触・爆風撃破
  - 軟ブロック下の出口解放
  - パワーアップ出現
  - 全敵撃破＋出口でクリア
- ステージフロー:
  - STAGE 1 CLEAR → つぎのステージ
  - 5面クリア → ALL CLEAR
  - ライフ0 → GAME OVER → ステージ1から
- パワーアップ引き継ぎ:
  - ON: 火力/爆弾数/スピード/ライフを次面へ
  - OFF: 火力/爆弾数/スピードをリセット、ライフのみ持ち越し
- たいせん:
  - CPU 1/2/3体
  - ラウンドクリア→最終結果
- ミックス:
  - CPU 2体＋モンスター5体を確認
  - CPU/ENEMY両HUD、CPU全滅でラウンド勝利
  - モンスターが軟ブロックを通過できないことを確認
- 盤面キャッシュ:
  - タイトル→開始、ワールド切替で再生成
- D-pad:
  - タップ1マス停止、長押し連続、離して停止
  - 同方向タップで追加移動なし
  - 垂直タップで1マス曲がる
  - 逆タップで反転停止
  - 中央デッドゾーン、左→上スライド
- ズーム防止:
  - `gesturestart` / `dblclick` の preventDefault を確認
  - `touch-action` をモバイル/横向き/320pxで確認
  - `visualViewport.scale` 正常、リセットボタン非表示
- モバイル/横向き/320px:
  - モード選択・引き継ぎ・CPU人数が収まる/スクロール可能
  - 横溢れなし
- `file://` 直開きで起動・プレイ可能

## 未確認（iPad実機で確認）
- iPad Safari のD-padダブルタップでズームしないこと
- ズーム後に爆弾ボタンが正常に反応すること
- 万一ズームした場合に「画面をリセット」で復帰できること
- 実機の音・safe-area・タッチ感

## 次にやること
1. iPad実機でD-padダブルタップ→ズームしないことを確認
2. ズーム後に爆弾・画面復帰が正常なことを確認
3. 問題があれば修正して再公開
4. スマホ実機で最終確認

## よく使うコマンド
```bash
cd ~/Documents/OpenCode/bomberman
node tools/stage_check.js 300
node tools/sim.js 20 normal 4242
node tools/playtest.js 10 normal 11
node tools/longrun.js 60 normal 2026
node tools/dom_smoke.js

cd ~/Documents/OpenCode
python3 .opencode/tools/verify_all.py
PYTHONUNBUFFERED=1 python3 .opencode/tools/serve.py .
```

> 元セッション: `ses_e3bb51f2fffeXixIkAiZOeISHV`（作業ディレクトリ記録は `.opencode` だったが実体は `bomberman/`）。
> 会話全文は `docs/session/transcript.md`、設計図は `docs/session/design-blueprint.md`、確定計画は `docs/session/implementation-plan.md`。
