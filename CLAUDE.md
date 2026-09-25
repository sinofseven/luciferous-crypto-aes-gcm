# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

`@luciferous/crypto-aes-gcm` は Web Crypto API 上に AES-GCM の鍵生成・暗号化・復号を薄くラップした ESM ライブラリ。ランタイム依存パッケージはゼロで、Cloudflare Workers と Node.js (>=26) を対象にしている。

## コマンド

| 目的                  | コマンド                                  |
| --------------------- | ----------------------------------------- |
| ビルド (`dist/` 生成) | `npm run build`                           |
| 型検査                | `npm run typecheck`                       |
| テスト                | `npm test` / `npm run test:watch`         |
| 単一ファイルのテスト  | `npx vitest run test/runtime.test.ts`     |
| 単一ケースのテスト    | `npx vitest run -t "runs inside workerd"` |
| Lint                  | `npm run lint`                            |
| フォーマット          | `npm run format`                          |

### `build` と `typecheck` のスコープが違う

- `npm run build` は `tsc`（ベースの `tsconfig.json`）で、`include: ["src"]` のみ。`dist/` へ出力する。
- `npm run typecheck` は `tsc -p tsconfig.test.json` で、`src` / `test` / `vitest.config.ts` を `noEmit` で検査する。**`test/` と設定ファイルの型エラーは `typecheck` でしか検出できない**ので、テストを触ったら必ずこちらを回す。

### oxlint は warning も含めて 0 件が基準

`.oxlintrc.json` は `correctness` / `suspicious` を error、`perf` / `style` を warn にしつつ、`rules` / `overrides` で個別ルールを上書きしている（`one-var` は常に分離、`func-style` は宣言のみ許可、`import/no-named-export` は無効化し `import/no-default-export` を有効化、`typescript/consistent-type-definitions` は `type` を優先、`vitest/no-importing-vitest-globals` と `capitalized-comments` は無効化、`test/**` は `no-magic-numbers` を許容、`vitest.config.ts` は default export を許容）。**現在 `npm run lint` は warning/error ともに 0 件が正常な状態**なので、自分の変更が新規に warning を出していないか常に確認すること。

## アーキテクチャと設計上の制約

### テストは workerd 上で走る（Node ではない）

`vitest.config.ts` は `@cloudflare/vitest-pool-workers` の `cloudflareTest()` を **Vite プラグインとして**使う。vitest 3 までの `test.poolOptions.workers` 形式は廃止済みなので復活させない。

- `test/runtime.test.ts` が `navigator.userAgent === "Cloudflare-Workers"` を assert しているのは、`crypto.subtle` のスモークテストだけでは Node 上でも通ってしまい、ランタイム差し替えの失敗に気づけないため。
- `miniflare.compatibilityDate: "2026-08-22"` は同梱の workerd が受け付ける上限日。これより新しい日付にするとランタイムが起動しない。pool のバージョンを上げたときは合わせて引き上げる。

### コンパイラオプションはベースの `tsconfig.json` に追加する

`tsconfig.test.json` は `tsconfig.json` を `extends` している。オプションを `tsconfig.test.json` 側だけに足すと `npm run build` 側で同じエラーが再発する。新しいオプションは必ずベースに入れる。

### 相対 import には `.ts` 拡張子を付ける

`allowImportingTsExtensions` + `rewriteRelativeImportExtensions` を有効にしているので、ソースは `./crypto.ts` と書き、ビルド時に `./crypto.js` へ書き換えられる。新しい内部 import も **`.ts` 付き**で書く（拡張子なしや `.js` にしない）。`module: "NodeNext"` + `"type": "module"` の組み合わせでは拡張子の省略が解決エラーになる。

### 型注釈の `Uint8Array` は `Uint8Array<ArrayBuffer>` と書く

TypeScript 5.7 以降 TypedArray はジェネリックになり、型引数を省略すると `ArrayBufferLike`（`SharedArrayBuffer` を含む）になって `BufferSource` に代入できない。

- `new Uint8Array(12)` のような**式は** `Uint8Array<ArrayBuffer>` に推論されるので問題ない。
- 壊れるのは**型注釈・interface の `extends`・関数の戻り値型**。ここでは型引数を明示する。

### `toBase64` / `fromBase64` は自前宣言

`src/crypto.ts` 冒頭の `Uint8ArrayWithBase64` / `Uint8ArrayConstructorWithBase64` とそのキャストは、TC39 の Uint8Array base64 メソッドが標準の型定義に未収録なため。lib に入ったらこの宣言群とキャストを削除する。

関連して `tsconfig.json` は `"types": []`、`lib: ["ES2022", "DOM"]`。ambient な `@types` を一切読まない設定なので、テストは vitest のヘルパーを明示的に import する必要がある（`globals: true` は typecheck を壊す）。`@cloudflare/workers-types` を反射的に足さない。なお `lib` の `DOM` は型を得るためのもので、ブラウザ対応を意味しない。

### 公開 API (`src/index.ts`)

`generateKey` / `importKey` / `encrypt` / `decrypt` と型 `PropsEncrypt` / `PropsDecrypt` のみを再エクスポートする。

- `generateKey()` は `CryptoKey` ではなく **base64 文字列**を返す。
- `encrypt()` の出力形式は `base64(iv):base64(ciphertext)`。IV は 12 バイトのランダム、鍵長は AES-256 固定。
- `decrypt()` は `:` で分割し、どちらかが欠けていれば `Invalid encrypted text format` を throw する。
- 内部ヘルパーの既定は `extractable: true` だが、`importKey()` は `extractable: false` を強制する。つまり **import した鍵は再 export できない**。

## kanban ワークフロー

`.claude/settings.json` で `kanban-kit@luciferous-plugins` プラグインを有効化している。タスクは `kanban/{連番4桁}_{title}/` に置き、タスク本文の markdown と作業ログ `log.md` をセットで持つ。既存例は `kanban/0001_fix_typecheck_errors/`。
