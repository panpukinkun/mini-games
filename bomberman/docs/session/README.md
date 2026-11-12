# セッション引き継ぎ資料（インデックス）

- 対象セッション: `ses_e3bb51f2fffeXixIkAiZOeISHV`
- タイトル: パンティンくんの遊び部屋向けボンバーマン実装計画
- 作成: 2026-11-10 16:10:03 / 更新: 2026-11-11 10:28:42

| ファイル | 内容 |
|---|---|
| `transcript.md` | 会話全文（user/assistant/ツール呼び出し/回答） |
| `raw.jsonl` | 25メッセージ＋113パーツの欠落なしアーカイブ（ローカルのみ推奨） |
| `design-blueprint.md` | 元のGemini設計図（最初の依頼） |
| `implementation-plan.md` | 確定版実装計画＋決定事項 |
| `../HANDOFF.md` | 現状・決定事項・次の手 |
| `../TODO.md` | Phase 1〜7のチェックリスト |
| `../tools/` | ヘッドレス検証スクリプト |

再生成: `python3 bomberman/tools/export_session.py`

※ `HANDOFF.md` と `TODO.md` は実装の進行に合わせて手動更新する。`export_session.py` は既存があれば上書きしません。
