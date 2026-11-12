# 確定版 実装計画

## セッション内の決定事項（質問への回答）


### [question · ユーザー回答]

- **サイト名の表記**: 既存サイトのタイトルは「パンプキンくんの遊び部屋」ですが、ご依頼文は「パンティンくん」でした。どちらが正しいですか？
  - 回答: パンプキンくん（既存に合わせる）
- **実装構成**: Gemini案（TS+Vite+Tailwind）をどう扱いますか？
  - 回答: ゼロビルド分割JSで移植（推奨）
- **プレイヤー残機**: プレイヤーの残機はどうしますか？
  - 回答: 3機（子供向け・推奨）


### [question · ユーザー回答]

- **検索避けの扱い**: 「限定公開」の実態はURL非掲載のみです。検索避けを強化しますか？
  - 回答: 現状維持（推奨）
- **実装後のデプロイ**: 実装完了後、本番（GitHub Pages）への反映まで含めますか？
  - 回答: バグなど、問題がちゃんと解決された上で、完成版をオンラインビルドする方式がよい。


## 計画テキスト（抜粋）

### assistant

## 確定版 実装計画

確認いただいた3点を反映しました：**パンプキンくん表記 / ゼロビルド分割JS / プレイヤー3機**。

### 成果物
```
bomberman/
  index.html   DOMシェル・CSS・仮想パッド・script順次読み込み
  config.js    13x11、速度、爆弾3s、アイテム確率、残機などの定数
  core.js      GameLoop(Delta Timeクランプ)、InputHandler、AABB＋コーナースライド
  map.js       MapManager（市松生成・軟ブロック破壊・アイテム配置）
  entities.js  Player / Bomb / Explosion / アイテム
  cpu.js       危険マスBFS回避＋接近＋脱出経路チェック
  audio.js     WebAudio合成音・初回タップunlock・ミュート
  ui.js        HUD・VirtualPad・Title/Pause/Result画面
  game.js      状態マシンと統括、localStorage保存、クリーンアップ
```
ルート `index.html` にカード＋QR `qr-bomberman` と `GAMES` 追記。

### 実装順序
1. `config.js` `core.js`：ループ・入力・衝突の土台
2. `map.js` `entities.js`：盤面生成・移動・爆弾・爆風・アイテム
3. `cpu.js`：3体AIと安全判定
4. `ui.js` `audio.js` `game.js`：HUD・パッド・状態遷移・音・連結
5. ハブ `index.html` 統合（カード・QR・フッター）
6. 検証と調整

### 受け入れ基準
- PC：矢印/WASD＋Space、P/Escポーズ、Mミュートで最後までプレイ可能
- モバイル：48px以上の十字＋爆弾ボタン、スクロール/ズーム無効、safe-area対応、`AudioContext.resume()`成功
- Delta Timeにより60/120Hzで体感速度が変わらない
- 爆弾の誘爆・軟ブロック破壊・3種アイテム・CPU3体・3機復帰が動作
- 再スタートでイベントリスナー/RAF/タイマーが残留しない
- `node --check` 全JS合格、`verify_all.py` 0エラー、`serve.py` でHTTP 200

### 検証手順
`node --check` → `verify_all.py` → ローカルサーバー疎通 → 手動マルチデバイス確認。実機ブラウザ確認は自動化できないため、未確認項目は「未検証」と明記します。

### 主なリスク対策
- 連鎖爆発は再帰でなくキュー処理
- タブ復帰時Deltaは0.05sクランプ
- 多ファイルはクラシックscript＋`window`名前空間で`file://`互換維持
- コミット/プッシュは指示があるまで実施しない

この計画で実装に進めてよければ承認してください。承認後すぐ着手します。

### assistant

## 最終実装計画（確定）

### 確定事項
- サイト名は **パンプキンくん**、技術は **ゼロビルド分割JS**、プレイヤー **3機**
- 検索避けは**現状維持**（noindex/robots.txt は追加しない）
- デプロイは**完成版のみ**。バグを全て解消し検証合格後に一度だけ `commit → push` し、本番反映を確認する（途中の壊れた状態はpushしない）

### ゲームタイトル（案）
**「ボムボムパンプキン」**（変更可）

### 成果物
```
bomberman/
  index.html   DOMシェル・CSS・仮想パッド・script順次読み込み
  config.js    13x11、速度、爆弾3s、アイテム確率、残機
  core.js      GameLoop(Delta Time 0.05sクランプ)、InputHandler、AABB＋コーナースライド
  map.js       市松マップ生成・軟ブロック破壊・アイテム配置
  entities.js  Player(3機/無敵)・Bomb(十字爆風/キュー式連鎖)・Explosion
  cpu.js       危険マスBFS回避＋接近＋脱出経路チェック
  audio.js     WebAudio合成音・初回タップunlock・ミュート(localStorage)
  ui.js        HUD・VirtualPad・Title/Pause/Result
  game.js      状態マシン統括・戦績保存・クリーンアップ
```
ルート `index.html`：カード（💣）＋QR `qr-bomberman`＋`GAMES`＋フッター追記。**全参照は相対パス**（`/mini-games/bomberman/` と `file://` 両対応）。

### 実装順序
1. `config.js` → `core.js`（ループ・入力・衝突）
2. `map.js` → `entities.js`（盤面・移動・爆弾・爆風・アイテム）
3. `cpu.js`（3体AI）
4. `ui.js` → `audio.js` → `game.js`（HUD・パッド・状態遷移・音・統合）
5. ハブ `index.html` 統合
6. 自己修復ループでバグ解消 → 完成版デプロイ

### 受け入れ基準
- PC：矢印/WASD＋Space、P/Escポーズ、Mミュートで1試合完走
- モバイル：48px以上の十字＋爆弾、スクロール/ズーム無効、safe-area対応、音が初回タップで鳴る
- 60/120Hzで体感速度が変わらない（Delta Time）
- 誘爆・軟ブロック破壊・Fire/Bomb/Speed・CPU3体・3機復帰・勝敗判定が動作
- 再スタートでリスナー/RAF/タイマーが残留しない
- `node --check` 全JS合格 / `verify_all.py` 0エラー / `serve.py` 全ファイルHTTP 200
- 実機ブラウザ確認は手動チェックリストで実施し、未確認は「未検証」と明記

### デプロイ手順（完成版のみ）
1. ローカルで全検証合格・バグ0を確認
2. `feat(bomberman): ボンバーマン風ゲームを追加`（既存のcommit書式に準拠）で commit → `origin main` へ push
3. Pagesビルド `built` を確認
4. `https://panpukinkun.github.io/mini-games/bomberman/?v=...` が200、ハブのカード/QR/リンクを本番で確認
5. キャッシュ10分を考慮し、必要ならクエリ付きで再確認

### リスク対策
- 連鎖爆発は再帰でなくキュー処理
- タブ復帰時の巨大Deltaは0.05sクランプ
- サブパス配信のため絶対パス禁止
- CPU BFSは13×11で毎フレーム全探索せず間引き実行

以上で実装に着手してよいか、承認をお願いします。承認後、Phase 4（実装）へ進みます。

