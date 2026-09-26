# 複数環境でのテスト実行 - 作業ログ

**開始時刻**: 2026-09-26T18:30:00+09:00

## タスク概要

テストの環境をNode.jsとCloudflare Workers相当の二つにしてください。Cloudflare Workersを主眼に置いているがNodeでもうごくことを担保したい。そのために一つのテストコードでNodeとCloudflare Workers相当、二つの環境分テストをするようにしてほしい。

## 調査結果

### 現在のテスト構成

- `vitest.config.ts`: Cloudflare Workers (workerd) 環境でテストを実行するために `@cloudflare/vitest-pool-workers` の `cloudflareTest()` プラグインを使用
- `miniflare.compatibilityDate: "2026-08-22"` で workerd の互換性日付を指定
- テストファイル: `test/runtime.test.ts` のみ
  - 1つ目のテスト: `navigator.userAgent === "Cloudflare-Workers"` でランタイム確認（workerd 専用）
  - 2つ目のテスト: Web Crypto API (`crypto.subtle`) でキーの生成・暗号化・復号を検証（両環境共通利用可能）

### ライブラリの対応状況

- `src/crypto.ts`: Web Crypto API の `crypto.subtle` のみを使用
- `src/index.ts`: 公開 API をエクスポート
- 依存パッケージ: Runtime 依存はなし、Node.js 26+ は `crypto.subtle` をネイティブサポート
- ライブラリのコード自体は Node.js 環境でも動作可能

### テスト実行状況

- 現在は `npm test` は workerd 環境でのみ実行（package.json の "test": "vitest run"）
- Node.js 環境でのテスト実行パスが存在しない

## 実装プラン

### 1. `vitest.config.node.ts` の新規作成

Node.js 環境用の vitest 設定ファイルを作成。`cloudflareTest()` プラグインを使わず、通常の vitest 設定として実装。

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: ["test/**/*.test.ts"],
  },
});
```

### 2. `test/runtime.test.ts` の修正

環境に応じてテストケースの実行/スキップを制御する。

- `describe.skipIf()` などのサポートを確認（vitest 4.1.11）
- または環境判定ロジックで `it.skip()` を条件付けして実装

Node.js 環境では:
- `navigator.userAgent` は `undefined` またはアクセス不可
- 1つ目のテスト（workerd 確認）はスキップ
- 2つ目のテスト（Web Crypto API）は実行

Cloudflare Workers 環境では:
- 両テスト実行（既存動作を維持）

### 3. `package.json` のテストスクリプト更新

```json
"scripts": {
  "test": "npm run test:node && npm run test:workers",
  "test:node": "vitest run -c vitest.config.node.ts",
  "test:workers": "vitest run -c vitest.config.ts",
  "test:watch": "vitest"
}
```

### 検証計画

1. `npm run test:node` → Node.js 環境でのテスト成功
2. `npm run test:workers` → Cloudflare Workers 環境でのテスト成功
3. `npm test` → 両環境が順に実行される
4. `npm run lint`, `npm run typecheck` で既存チェック継続

## プランニング経緯

初回提案がそのまま承認された。

## 会話内容

ユーザーは「一つのテストコードで複数環境でのテスト実行」を要望。複数 vitest 設定ファイルを使う方針を提案し、承認を得た。

## 実装フェーズ

### Step 1: vitest.config.node.ts の作成

**実施内容:**
Node.js 環境用の vitest 設定ファイルを新規作成。`cloudflareTest()` プラグインを使わず、通常の vitest 設定として実装。

**ファイル内容:**
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: ["test/**/*.test.ts"],
  },
});
```

### Step 2: test/runtime.test.ts の修正

**実施内容:**
環境判定ロジック（`isWorkerRuntime` 定数）を追加。三項演算子で `it` と `it.skip` を切り替えることで、Cloudflare Workers 環境では両テストが実行され、Node.js 環境では「runs inside workerd, not Node」テストがスキップされるように実装。

**変更内容:**
- `isWorkerRuntime` 定数を追加: `typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers"`
- `it()` を `(isWorkerRuntime ? it : it.skip)()` に変更

### Step 3: package.json の修正

**実施内容:**
テストスクリプトを拡張して、両環境でテスト実行できるように調整。

**変更内容:**
- `"test"`: `"npm run test:node && npm run test:workers"` に変更（両環境を順に実行）
- `"test:node"`: 新規追加（Node 環境のみテスト実行）
- `"test:workers"`: 新規追加（Workers 環境のみテスト実行）

### Step 4: .oxlintrc.json の修正

**実施内容:**
vitest 設定ファイルとテストファイルの lint ルール override を調整。

**変更内容:**
- `vitest.config.ts` の override を `vitest.config*.ts` に拡張（wildcard で両ファイルに適用）
- `test/**` に以下のルール許容を追加:
  - `no-ternary`: off（三項演算子を許容）
  - `vitest/no-standalone-expect`: off（条件付け時の expect 許容）
  - `vitest/require-hook`: off（環境判定の条件式許容）

### Step 5: テスト実行検証

**実行結果:**
1. `npm run test:node`: ✅ Test Files 1 passed (1 test passed, 1 skipped)
2. `npm run test:workers`: ✅ Test Files 1 passed (2 tests passed)
3. `npm test`: ✅ 両環境が順に実行される
4. `npm run lint`: ✅ 0 errors, 0 warnings
5. `npm run typecheck`: ✅ No type errors

**完了日時**: 2026-09-26T18:35:00+09:00

