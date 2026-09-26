# 複数環境でのテスト実行

## 目的
Cloudflare Workersを主眼に置いているがNodeでもうごくことを担保したい。そのために一つのテストコードでNodeとCloudflare Workers相当、二つの環境分テストをするようにしてほしい。

## 要望
テストの環境をNodeとCloudflare Workers相当の二つにしてください。

## 完了サマリー

**完了日時**: 2026-09-26T18:35:00+09:00

複数環境でのテスト実行を実装しました。以下の対応を実施：

### 実装内容

1. **`vitest.config.node.ts` 新規作成**: Node.js 環境用の vitest 設定ファイル
2. **`test/runtime.test.ts` 修正**: 環境判定ロジック（`isWorkerRuntime`）を追加し、三項演算子で条件付けテスト実行を実装
3. **`package.json` 修正**: テストスクリプトを拡張
   - `test`: Node と Workers の両環境を順に実行
   - `test:node`: Node 環境のみ実行
   - `test:workers`: Workers 環境のみ実行
4. **`.oxlintrc.json` 修正**: vitest 設定ファイルとテストファイルの lint ルール override を調整

### 検証結果

- ✅ `npm run test:node`: 1 passed, 1 skipped
- ✅ `npm run test:workers`: 2 passed
- ✅ `npm test`: 両環境が順に実行される
- ✅ `npm run lint`: 0 errors
- ✅ `npm run typecheck`: No errors
- ✅ `npm run build`: 正常に dist/ を生成

### テスト動作概要

**Node.js 環境:**
- ランタイム判定テストはスキップされる（`navigator` が undefined のため）
- Web Crypto API テストが実行される（Node.js 26+ でサポート）

**Cloudflare Workers 環境:**
- ランタイム判定テストが実行される
- Web Crypto API テストが実行される
