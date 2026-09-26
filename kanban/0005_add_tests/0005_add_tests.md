# テストコードを追加

## 目的
実装の品質を保つためにテストコードが欲しい

## 要望
テストコードを書いてください

## プラン

`src/index.ts` 経由で公開されている API（`generateKey` / `importKey` / `encrypt` / `decrypt`）に対する直接テストが存在しないため、`test/crypto.test.ts` を新規作成してカバーする。

- 実施内容の概要:
  - 実装前にまず最小のラウンドトリップテスト（`generateKey` → `importKey` → `encrypt` → `decrypt`）を書き、内部で使われている `toBase64`/`fromBase64`（TC39 base64 API）が workerd 上でも動作することを確認する
  - 問題なければ、`generateKey`/`importKey`/`encrypt`/`decrypt` それぞれの正常系・異常系・エッジケース（フォーマットエラー、誤った鍵での復号、改ざん検出、空文字列・マルチバイト文字列のラウンドトリップ等）をカバーするテストケースを追加する
- 変更するファイル・コンポーネント:
  - 新規: `test/crypto.test.ts`
  - 設定ファイル（vitest.config.ts 等）は `test/**/*.test.ts` を include 済みのため変更不要
- 採用したアプローチと理由:
  - 公開API（`src/index.ts`）経由でテストし、非公開の内部ヘルパー（`src/crypto.ts` の `*ByApi` 関数）は直接テストしない。CLAUDE.md 上の公開契約に従う
  - エラーメッセージはランタイム依存（Node/workerd で異なりうる）ため、ライブラリが明示的に throw する `"Invalid encrypted text format"` のみメッセージを検証し、他は reject の発生のみ確認する

---

## 完了サマリー

- **完了日時**: 2026-09-26T23:41:25+09:00
- **対応内容**:
  - `test/crypto.test.ts` を新規作成し、公開API（`generateKey`/`importKey`/`encrypt`/`decrypt`）をカバーする20テストケースを追加
  - 実装前に最小のラウンドトリップテストのみで workerd 上の base64 API 動作を先に確認（Gate 0）、問題なく動作することを確認した上で残りのテストケースを実装
  - `npm run typecheck` / `npm run lint`（warning/error 0件）/ `npm run test:node`（19 passed, 1 skipped）/ `npm run test:workers`（20 passed）/ `npm test` / `npm run build` をすべて実行し成功を確認
- **変更ファイル**:
  - `test/crypto.test.ts`（新規）
- **備考**: 実装中に oxlint の vitest プラグインで複数の warning/error（import/オブジェクトキー順序、describe タイトル、toThrow のメッセージ必須化など）を検出・修正した。特に `extractable === false` の boolean 検証では `toBe`/`toBeFalsy`/`toStrictEqual`/`toEqual` のいずれも相互に矛盾する複数の vitest lint ルールに抵触したため、真偽値を文字列に変換してから `toBe` で比較する形で回避した。詳細は `kanban/0005_add_tests/log.md` を参照。git commit は未実施。
