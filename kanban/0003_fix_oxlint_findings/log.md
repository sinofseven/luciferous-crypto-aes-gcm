# 0003_fix_oxlint_findings 作業ログ

開始日時: 2026-09-26T05:04:06+09:00

## タスク概要

要望: oxlintの警告・エラーの修正をして欲しい
目的: コード品質のために、リントの警告・エラーに対して下記方針に従って実装の修正、oxlintの設定変更を行ってほしい

方針（kanban ファイル本文より、ルールごとに要約せず転記）:

- one-var (eslint): 常に分離するようにして欲しい。実装が分離するようにしているのでoxlintの設定を変更してほしい。
- func-style (eslint): 一旦下記方針とする。現実装でこの設定で問題があるのなら、それも修正してほしい。
  ```json
  { "rules": { "func-style": ["error", "declaration"], "prefer-arrow-callback": "error" } }
  ```
- no-named-export (import): default exportを禁止してnamed exportのみに制限したい。
- sort-keys (eslint): このルールに従い、プロパティ定義をアルファベット順にして欲しい。
- group-exports (import): ファイル末尾でのgroup exportsに修正して欲しい。
- consistent-type-definitions (typescript): 原則typeを使う。Uint8Arrayに `toBase64()` と `fromBase64()` を生やす必要があるので、そこだけはinterfaceにしたい。
- prefer-expect-assertions (vitest): このルールに従ってテストの実装を修正してほしい。
- no-magic-numbers (eslint): テストコード(`test/runtime.test.ts`)ではマジックナンバーを許容しつつ、実装上は名前付き定数を使うことを強制して欲しい。
- method-signature-style (typescript): プロパティシグネチャに修正してほしい。
- no-importing-vitest-globals (vitest): `globals: false` としてimportをする形式にして欲しい。
- exports-last (import): 末尾でexportするようにして欲しい。
- capitalized-comments (eslint): 日本語コメントを許容したいので警告を表示しないように設定を変更してほしい。
- array-type (typescript): arrayを使うようにして欲しい。`keyUsage` プロパティに対しては事前に `type AllKeyUsages = "encrypt" | ...` のように書いて `keyUsage: AllKeyUsages[]` として欲しい。

## 調査結果

### `.oxlintrc.json`（変更前の全内容）

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "oxc", "import", "vitest"],
  "categories": {
    "correctness": "error",
    "suspicious": "error",
    "perf": "warn",
    "style": "warn"
  },
  "rules": {},
  "ignorePatterns": ["dist"],
  "env": {
    "builtin": true
  }
}
```

個別ルールの override はなく、`categories.style: "warn"` によって one-var / func-style / sort-keys / no-magic-numbers / capitalized-comments / consistent-type-definitions / method-signature-style / array-type / no-named-export / group-exports / exports-last / prefer-expect-assertions / no-importing-vitest-globals など多数の style 系ルールが warn として一括有効化されている状態だった。

### `package.json`（関連部分）

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc -p tsconfig.test.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build",
    "format": "oxfmt",
    "lint": "oxlint"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.22.0",
    "oxfmt": "^0.70.0",
    "oxlint": "^1.85.0",
    "typescript": "^5.9.3",
    "vitest": "^4.1.11"
  }
}
```

`npm run lint` は `oxlint`（引数なし、カレントディレクトリを再帰的に対象、`.oxlintrc.json` を自動読込）。インストールされている oxlint の実バージョンは `npx oxlint --version` で `1.85.0` と確認。

### `npm run lint` 実行結果（変更前、全59件、そのまま転記）

exit code は `0`（すべて `warning` で `error` は0件のため）。

```
src/index.ts:1:1: warning import(no-named-export): Named exports are not allowed. help: Replace named exports with a single export default to ensure a consistent module entry point.
src/index.ts:2:1: warning import(no-named-export): Named exports are not allowed. help: Replace named exports with a single export default to ensure a consistent module entry point.
test/runtime.test.ts:5:5: warning eslint(capitalized-comments): Comments should not begin with a lowercase letter help: Change the first letter of the comment to uppercase
test/runtime.test.ts:15:5: warning eslint(one-var): Combine this with the previous 'const' statement. help: Combine variable declarations
test/runtime.test.ts:16:5: warning eslint(one-var): Combine this with the previous 'const' statement. help: Combine variable declarations
test/runtime.test.ts:18:5: warning eslint(one-var): Combine this with the previous 'const' statement. help: Combine variable declarations
test/runtime.test.ts:19:5: warning eslint(one-var): Combine this with the previous 'const' statement. help: Combine variable declarations
test/runtime.test.ts:4:3: warning vitest(prefer-expect-assertions): This test should have either `expect.assertions(<number of assertions>)` or `expect.hasAssertions()` as its first expression. help: Add `expect.hasAssertions()` or `expect.assertions(<number>)` as the first statement in this test.
test/runtime.test.ts:10:3: warning vitest(prefer-expect-assertions): This test should have either `expect.assertions(<number of assertions>)` or `expect.hasAssertions()` as its first expression. help: Add `expect.hasAssertions()` or `expect.assertions(<number>)` as the first statement in this test.
test/runtime.test.ts:1:10: warning vitest(no-importing-vitest-globals): Do not `import`/`require` global functions from 'vitest'. help: You can import anything except `suite, test, chai, describe, it, expectTypeOf, assertType, expect, assert, vitest, vi, beforeAll, afterAll, beforeEach, afterEach, onTestFailed, onTestFinished`.
test/runtime.test.ts:11:49: warning eslint(sort-keys): Object keys should be sorted help: Replace `name: "AES-GCM", length: 256` with `length: 256, name: "AES-GCM"`.
test/runtime.test.ts:15:54: warning eslint(no-magic-numbers): No magic number: 12 help: Use a named constant instead of a magic number to make the code more readable and maintainable.
test/runtime.test.ts:18:52: warning eslint(sort-keys): Object keys should be sorted help: Replace `name: "AES-GCM", iv` with `iv, name: "AES-GCM"`.
test/runtime.test.ts:19:54: warning eslint(sort-keys): Object keys should be sorted help: Replace `name: "AES-GCM", iv` with `iv, name: "AES-GCM"`.
src/crypto.ts:53:1: warning import(exports-last): Export statements should appear at the end of the file help: Move this export to the end of the file, after all other statements.
src/crypto.ts:86:1: warning import(group-exports): Multiple named export declarations; consolidate all named exports into a single export declaration help: Use a single export declaration with multiple specifiers: `export { spec1, spec2 }`
src/crypto.ts:92:1: warning import(group-exports): Multiple named export declarations; consolidate all named exports into a single export declaration help: Use a single export declaration with multiple specifiers: `export { spec1, spec2 }`
src/crypto.ts:97:1: warning import(group-exports): Multiple named export declarations; consolidate all named exports into a single export declaration help: Use a single export declaration with multiple specifiers: `export { spec1, spec2 }`
src/crypto.ts:109:1: warning import(group-exports): Multiple named export declarations; consolidate all named exports into a single export declaration help: Use a single export declaration with multiple specifiers: `export { spec1, spec2 }`
src/crypto.ts:53:1: warning import(group-exports): Multiple named export declarations; consolidate all named exports into a single export declaration help: Use a single export declaration with multiple specifiers: `export { spec1, spec2 }`
src/crypto.ts:104:1: warning import(group-exports): Multiple named export declarations; consolidate all named exports into a single export declaration help: Use a single export declaration with multiple specifiers: `export { spec1, spec2 }`
src/crypto.ts:19:1: warning eslint(one-var): Combine this with the previous 'const' statement. help: Combine variable declarations
src/crypto.ts:20:1: warning eslint(one-var): Combine this with the previous 'const' statement. help: Combine variable declarations
src/crypto.ts:21:1: warning eslint(one-var): Combine this with the previous 'const' statement. help: Combine variable declarations
src/crypto.ts:32:3: warning eslint(one-var): Combine this with the previous 'const' statement. help: Combine variable declarations
src/crypto.ts:49:3: warning eslint(one-var): Combine this with the previous 'const' statement. help: Combine variable declarations
src/crypto.ts:66:3: warning eslint(one-var): Combine this with the previous 'const' statement. help: Combine variable declarations
src/crypto.ts:88:3: warning eslint(one-var): Combine this with the previous 'const' statement. help: Combine variable declarations
src/crypto.ts:99:3: warning eslint(one-var): Combine this with the previous 'const' statement. help: Combine variable declarations
src/crypto.ts:100:3: warning eslint(one-var): Combine this with the previous 'const' statement. help: Combine variable declarations
src/crypto.ts:114:3: warning eslint(one-var): Combine this with the previous 'const' statement.
src/crypto.ts:115:3: warning eslint(one-var): Combine this with the previous 'const' statement. help: Combine variable declarations
src/crypto.ts:11:3: warning typescript(method-signature-style): Use a property signature instead of a method signature. help: Replace the method signature with a property whose type is a function type.
src/crypto.ts:15:3: warning typescript(method-signature-style): Use a property signature instead of a method signature. help: Replace the method signature with a property whose type is a function type.
src/crypto.ts:23:1: warning typescript(consistent-type-definitions): Use `interface` instead of `type`. help: Replace `type KeyConfig = { extractable?: boolean; keyUsages?: Array< "encrypt" | "decrypt" | "sign" | "verify" | "deriveKey" | "deriveBits" | "wrapKey" | "unwrapKey" >; };` with `interface KeyConfig { extractable?: boolean; keyUsages?: Array< "encrypt" | "decrypt" | "sign" | "verify" | "deriveKey" | "deriveBits" | "wrapKey" | "unwrapKey" >; }`.
src/crypto.ts:25:15: warning typescript(array-type): Array type using 'Array<T>' is forbidden. Use 'T[]' instead. help: Replace `Array< "encrypt" | "decrypt" | "sign" | "verify" | "deriveKey" | "deriveBits" | "wrapKey" | "unwrapKey" >` with `("encrypt" | "decrypt" | "sign" | "verify" | "deriveKey" | "deriveBits" | "wrapKey" | "unwrapKey")[]`.
src/crypto.ts:30:1: warning eslint(func-style): Expected a function expression. help: Enforce the consistent use of either `function` declarations or expressions assigned to variables
src/crypto.ts:34:5: warning eslint(sort-keys): Object keys should be sorted help: Replace `name: algorithmName, length: lengthKey` with `length: lengthKey, name: algorithmName`.
src/crypto.ts:43:1: warning eslint(func-style): Expected a function expression. help: Enforce the consistent use of either `function` declarations or expressions assigned to variables
src/crypto.ts:47:1: warning eslint(func-style): Expected a function expression. help: Enforce the consistent use of either `function` declarations or expressions assigned to variables
src/crypto.ts:53:1: warning import(no-named-export): Named exports are not allowed. help: Replace named exports with a single export default to ensure a consistent module entry point.
src/crypto.ts:53:8: warning typescript(consistent-type-definitions): Use `interface` instead of `type`. help: Replace `type PropsEncrypt = { plaintext: string; key: CryptoKey; };` with `interface PropsEncrypt { plaintext: string; key: CryptoKey; }`.
src/crypto.ts:58:1: warning typescript(consistent-type-definitions): Use `interface` instead of `type`. help: Replace `type OutputEncryptByApi = { ciphertext: ArrayBuffer; iv: Uint8Array<ArrayBuffer>; };` with `interface OutputEncryptByApi { ciphertext: ArrayBuffer; iv: Uint8Array<ArrayBuffer>; }`.
src/crypto.ts:63:1: warning eslint(func-style): Expected a function expression. help: Enforce the consistent use of either `function` declarations or expressions assigned to variables
src/crypto.ts:64:52: warning eslint(no-magic-numbers): No magic number: 12 help: Use a named constant instead of a magic number to make the code more readable and maintainable.
src/crypto.ts:67:5: warning eslint(sort-keys): Object keys should be sorted help: Replace `name: algorithmName, iv` with `iv, name: algorithmName`.
src/crypto.ts:74:1: warning typescript(consistent-type-definitions): Use `interface` instead of `type`. help: Replace `type PropsDecryptByApi = { ciphertext: BufferSource; key: CryptoKey; iv: Uint8Array<ArrayBuffer>; };` with `interface PropsDecryptByApi { ciphertext: BufferSource; key: CryptoKey; iv: Uint8Array<ArrayBuffer>; }`.
src/crypto.ts:80:1: warning eslint(func-style): Expected a function expression. help: Enforce the consistent use of either `function` declarations or expressions assigned to variables
src/crypto.ts:81:43: warning eslint(sort-keys): Object keys should be sorted help: Replace `name: algorithmName, iv` with `iv, name: algorithmName`.
src/crypto.ts:86:1: warning import(no-named-export): Named exports are not allowed. help: Replace named exports with a single export default to ensure a consistent module entry point.
src/crypto.ts:86:8: warning eslint(func-style): Expected a function expression. help: Enforce the consistent use of either `function` declarations or expressions assigned to variables
src/crypto.ts:92:1: warning import(no-named-export): Named exports are not allowed. help: Replace named exports with a single export default to ensure a consistent module entry point.
src/crypto.ts:92:8: warning eslint(func-style): Expected a function expression. help: Enforce the consistent use of either `function` declarations or expressions assigned to variables
src/crypto.ts:97:1: warning import(no-named-export): Named exports are not allowed. help: Replace named exports with a single export default to ensure a consistent module entry point.
src/crypto.ts:97:8: warning eslint(func-style): Expected a function expression. help: Enforce the consistent use of either `function` declarations or expressions assigned to variables
src/crypto.ts:104:1: warning import(no-named-export): Named exports are not allowed. help: Replace named exports with a single export default to ensure a consistent module entry point.
src/crypto.ts:104:8: warning typescript(consistent-type-definitions): Use `interface` instead of `type`. help: Replace `type PropsDecrypt = { encryptedText: string; key: CryptoKey; };` with `interface PropsDecrypt { encryptedText: string; key: CryptoKey; }`.
src/crypto.ts:109:1: warning import(no-named-export): Named exports are not allowed. help: Replace named exports with a single export default to ensure a consistent module entry point.
src/crypto.ts:109:8: warning eslint(func-style): Expected a function expression. help: Enforce the consistent use of either `function` declarations or expressions assigned to variables
```

### ファイル別・ルール別の件数（合計59件、error 0件）

- `eslint(one-var)` 15件（`src/crypto.ts` L19,20,21,32,49,66,88,99,100,114,115／`test/runtime.test.ts` L15,16,18,19）
- `eslint(func-style)` 9件（すべて `src/crypto.ts`: L30,43,47,63,80,86,92,97,109）
- `import(no-named-export)` 8件（`src/index.ts` L1,2／`src/crypto.ts` L53,86,92,97,104,109）
- `import(group-exports)` 6件（すべて `src/crypto.ts`: L53,86,92,97,104,109）
- `eslint(sort-keys)` 6件（`src/crypto.ts` L34,67,81／`test/runtime.test.ts` L11,18,19）
- `typescript(consistent-type-definitions)` 5件（すべて `src/crypto.ts`: L23 `KeyConfig`, L53 `PropsEncrypt`, L58 `OutputEncryptByApi`, L74 `PropsDecryptByApi`, L104 `PropsDecrypt`）
- `vitest(prefer-expect-assertions)` 2件（`test/runtime.test.ts` L4, L10）
- `typescript(method-signature-style)` 2件（`src/crypto.ts` L11 `toBase64`, L15 `fromBase64`）
- `eslint(no-magic-numbers)` 2件（`src/crypto.ts` L64 の `12`（IV長）／`test/runtime.test.ts` L15 の `12`）
- `vitest(no-importing-vitest-globals)` 1件（`test/runtime.test.ts` L1）
- `typescript(array-type)` 1件（`src/crypto.ts` L25）
- `import(exports-last)` 1件（`src/crypto.ts` L53）
- `eslint(capitalized-comments)` 1件（`test/runtime.test.ts` L5）

ファイル別: `src/crypto.ts` 45件、`test/runtime.test.ts` 12件、`src/index.ts` 2件。

### `src/crypto.ts`（変更前、全118行）

```typescript
interface Uint8ArrayBase64Options {
  alphabet?: "base64" | "base64url";
  omitPadding?: boolean;
}

interface Uint8ArrayFromBase64Options extends Uint8ArrayBase64Options {
  lastChunkHandling?: "loose" | "strict" | "stop-before-partial";
}

interface Uint8ArrayWithBase64 extends Uint8Array<ArrayBuffer> {
  toBase64(options?: Uint8ArrayBase64Options): string;
}

interface Uint8ArrayConstructorWithBase64 extends Uint8ArrayConstructor {
  fromBase64(base64: string, options?: Uint8ArrayFromBase64Options): Uint8Array<ArrayBuffer>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const algorithmName = "AES-GCM";
const lengthKey = 256;

type KeyConfig = {
  extractable?: boolean;
  keyUsages?: Array<
    "encrypt" | "decrypt" | "sign" | "verify" | "deriveKey" | "deriveBits" | "wrapKey" | "unwrapKey"
  >;
};

function generateKeyByApi(props?: KeyConfig): Promise<CryptoKey> {
  const extractable = props?.extractable ?? true;
  const keyUsage = props?.keyUsages ?? ["encrypt", "decrypt"];
  return crypto.subtle.generateKey(
    {
      name: algorithmName,
      length: lengthKey,
    },
    extractable,
    keyUsage,
  ) as Promise<CryptoKey>;
}

function exportKeyByApi(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("raw", key) as Promise<ArrayBuffer>;
}

function importKeyByApi(raw: BufferSource, config?: KeyConfig): Promise<CryptoKey> {
  const extractable = config?.extractable ?? true;
  const keyUsage = config?.keyUsages ?? ["encrypt", "decrypt"];
  return crypto.subtle.importKey("raw", raw, { name: algorithmName }, extractable, keyUsage);
}

export type PropsEncrypt = {
  plaintext: string;
  key: CryptoKey;
};

type OutputEncryptByApi = {
  ciphertext: ArrayBuffer;
  iv: Uint8Array<ArrayBuffer>;
};

async function encryptByApi({ plaintext, key }: PropsEncrypt): Promise<OutputEncryptByApi> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: algorithmName, iv },
    key,
    encoder.encode(plaintext),
  );
  return { ciphertext, iv };
}

type PropsDecryptByApi = {
  ciphertext: BufferSource;
  key: CryptoKey;
  iv: Uint8Array<ArrayBuffer>;
};

async function decryptByApi({ ciphertext, key, iv }: PropsDecryptByApi): Promise<string> {
  const raw = await crypto.subtle.decrypt({ name: algorithmName, iv }, key, ciphertext);

  return decoder.decode(raw);
}

export async function generateKey(): Promise<string> {
  const key = await generateKeyByApi();
  const raw = await exportKeyByApi(key);
  return (new Uint8Array(raw) as Uint8ArrayWithBase64).toBase64();
}

export async function importKey(rawKey: string): Promise<CryptoKey> {
  const raw = (Uint8Array as Uint8ArrayConstructorWithBase64).fromBase64(rawKey);
  return importKeyByApi(raw, { extractable: false });
}

export async function encrypt(props: PropsEncrypt): Promise<string> {
  const resp = await encryptByApi(props);
  const vector = (resp.iv as Uint8ArrayWithBase64).toBase64();
  const data = (new Uint8Array(resp.ciphertext) as Uint8ArrayWithBase64).toBase64();
  return `${vector}:${data}`;
}

export type PropsDecrypt = {
  encryptedText: string;
  key: CryptoKey;
};

export async function decrypt({ encryptedText, key }: PropsDecrypt): Promise<string> {
  const [base64Iv, base64Ciphertext] = encryptedText.split(":");
  if (base64Iv === undefined || base64Ciphertext === undefined) {
    throw new Error("Invalid encrypted text format");
  }
  const iv = (Uint8Array as Uint8ArrayConstructorWithBase64).fromBase64(base64Iv);
  const ciphertext = (Uint8Array as Uint8ArrayConstructorWithBase64).fromBase64(base64Ciphertext);
  return decryptByApi({ ciphertext, iv, key });
}
```

### `src/index.ts`（変更前、全2行）

```typescript
export { generateKey, importKey, encrypt, decrypt } from "./crypto.ts";
export type { PropsEncrypt, PropsDecrypt } from "./crypto.ts";
```

### `test/runtime.test.ts`（変更前、全19行）

```typescript
import { describe, expect, it } from "vitest";

describe("test runtime", () => {
  it("runs inside workerd, not Node", () => {
    // crypto.subtle だけでは Node でも通ってしまうため、
    // 実際に Workers ランタイムで動いていることをここで確かめる。
    expect(navigator.userAgent).toBe("Cloudflare-Workers");
  });

  it("exposes the Web Crypto API the library will build on", async () => {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
      "encrypt",
      "decrypt",
    ]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode("hello");

    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
    const roundTripped = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);

    expect(new TextDecoder().decode(roundTripped)).toBe("hello");
  });
});
```

### `vitest.config.ts`（変更前、全内容）

```typescript
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: "2026-08-22",
      },
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"],
  },
});
```

`export default defineConfig({...})` を使っており default export。

### oxlint の設定モデルに関する調査（`node_modules/oxlint/configuration_schema.json` および web ドキュメント）

- `.oxlintrc.json` トップレベルのプロパティ: `$schema`, `categories`, `env`, `extends`, `globals`, `ignorePatterns`, `jsPlugins`, `options`, `overrides`, `plugins`, `rules`, `settings`。
- `rules` の値定義（`OxlintRules`）はスキーマ上 `DummyRuleMap`（任意のキーを許容する動的マップ）であり、スキーマからは個別ルール名・オプション形状は取得できない。実際の警告出力（`eslint(one-var)` 等のプレフィックス表記）とESLint v8互換という設計方針から、コア(eslint)ルールはプレフィックスなし、プラグイン由来ルールは `<plugin>/<rule>` 形式で書くことを確認。
- `overrides`（`OxlintOverride` 定義）は `files`（必須、glob配列）、`excludeFiles`、`env`、`globals`、`jsPlugins`、`plugins`、`rules` を持つオブジェクトの配列。特定ファイルパターンだけルールを上書きできる。
- インラインの無効化コメント構文（[oxc.rs ignore-comments](https://oxc.rs/docs/guide/usage/linter/ignore-comments.html)）:
  - ファイル全体: `/* oxlint-disable */` または `/* oxlint-disable <rule> */`
  - 現在行: `// oxlint-disable-line <rule>`
  - 次の行: `// oxlint-disable-next-line <rule>`
  - 複数ルール: `// oxlint-disable-next-line rule1, rule2`
  - `eslint-disable*` 形式も互換性のため使用可能だが `oxlint-*` が推奨
  - インラインコメントは有効/無効の切り替えのみ可能で、ルールのオプション自体は変更できない

### 各ルールのオプション調査（oxc.rs ドキュメント + oxc本体ソース）

- **`typescript/consistent-type-definitions`**: オプションは `"interface"`（デフォルト）または `"type"`。`"type"` を指定した場合でも、既存の `interface` 宣言を維持したい箇所には inline ignore コメント（`oxlint-disable-next-line`）で除外できる。
- **`typescript/method-signature-style`**: オプションは `"property"`（プロパティ関数型を強制）または `"method"`。現在の警告内容（メソッドシグネチャ→プロパティ関数型への変換提案）から、デフォルトは `"property"` 相当で、既存コードの `toBase64(...)`/`fromBase64(...)` は変換対象と判明。
- **`typescript/array-type`**: `default` オプションは `"array"`（デフォルト、`T[]` を強制）/`"array-simple"`/`"generic"`。デフォルトのまま `T[]` 記法にすればよく、設定変更は不要。
- **`eslint/no-magic-numbers`**: `ignore`（許可する数値の配列）、`ignoreArrayIndexes`、`ignoreDefaultValues` 等のオプションを持つが、ファイル単位での無効化オプションはルール自体には無く、`.oxlintrc.json` の `overrides` で対応する必要がある。
- **`eslint/capitalized-comments`**: 第1オプション `"always"|"never"`、第2オプションに `ignoreConsecutiveComments`, `ignoreInlineComments`, `ignorePattern`（正規表現） を持つ。`ignorePattern` で日本語文字始まりのコメントだけ除外する案を検討したが、実際に警告が出ているコメント（`test/runtime.test.ts:5` の `// crypto.subtle だけでは...`）は英字小文字（`crypto.subtle` というAPI名）で始まる日本語混じりコメントであり、「先頭が日本語文字かどうか」だけでは正しく除外できないと判断。ルール自体を `off` にする方針とした。
- **`eslint/sort-keys`**: 第1オプション `"asc"|"desc"`（デフォルト `"asc"`）、`caseSensitive`（デフォルト `true`）、`minKeys`（デフォルト `2`）、`natural`（デフォルト `false`）。デフォルトのままで方針（アルファベット順）に合致するため設定変更は不要、コード側でキー順を直すだけでよい。
- **`vitest/no-importing-vitest-globals`**: oxc本体の Rust 実装（`crates/oxc_linter/src/rules/vitest/no_importing_vitest_globals.rs`）を直接確認したところ、`#[derive(Debug, Default, Clone)] pub struct NoImportingVitestGlobals;` という **オプションを一切持たない stateless なルール**であることが判明。vitest.config.ts の `globals` 設定の実際の値に関係なく、`vitest` パッケージからの17個のグローバル関数名（`suite, test, chai, describe, it, expectTypeOf, assertType, expect, assert, vitest, vi, beforeAll, afterAll, beforeEach, afterEach, onTestFailed, onTestFinished`）の named import を常に警告する仕組み。このためCLAUDE.mdが明言する「`globals: true` は typecheck を壊すので明示importが必要」という設計方針とはこのルールが原理的に両立しないと判断し、ルール自体を無効化する方針とした。
- **`import/no-default-export`**: import プラグインのルールとして存在するが、今回の lint 結果には出ていない（デフォルトで無効）。`plugins` に `"import"` は既に含まれているため、`rules` に明示的に追加すれば有効化できる。
- **`import/no-named-export`**: `style` カテゴリに属する（現状警告として出ている）。
- **`import/exports-last`** / **`import/group-exports`**: いずれも設定オプションは無く、有効/無効の切り替えのみのシンプルなルール。

### `.claude/settings.json`（参考、kanban-kit プラグイン設定確認のため）

```json
{
  "extraKnownMarketplaces": {
    "luciferous-plugins": {
      "source": { "source": "github", "repo": "sinofseven/luciferous-plugins-for-claude-code" }
    }
  },
  "enabledPlugins": { "kanban-kit@luciferous-plugins": true }
}
```

## 実装プラン（完全版）

kanban ファイル本文の `## プラン` セクションと同内容。ルールごとの対応方針・`.oxlintrc.json` の最終形・検証時の注意点（`import/no-default-export` が実際に発火するか単体確認してから override を足す、`overrides` の `files: ["test/**"]` が実際に効くか確認する、`group-exports` が2文構成で通らない場合のフォールバック、`oxlint-disable-next-line` のプレフィックスが効かない場合のフォールバック）は kanban ファイル本文を参照。

## プランニング経緯

初回提案（Explore エージェントによる調査結果をもとに作成した上記プラン）がそのまま承認された。承認前に advisor に相談し、以下の指摘を受けて検証手順を強化した:

- `import/no-default-export` を有効化した直後に `vitest.config.ts` 用の override を同時に加えると、ルールが実際に発火することを一度も確認しないまま設定が完了してしまう。override を入れる前に一度 lint を実行し、`vitest.config.ts` がエラーとして検出されることを確認すべき。
- `overrides` の `files: ["test/**"]` は glob の実装によってはディレクトリではなくファイルにマッチしない可能性があるため、`no-magic-numbers` の警告が実際に消えるか確認すべき。
- `group-exports` を「値エクスポート1文＋型エクスポート1文」の2文構成にする案は未検証の仮定であり、lint実行後に警告が残っていないか確認し、残っていれば `export { ..., type PropsEncrypt, type PropsDecrypt };` の1文構成にフォールバックする。
- `npm run format`（oxfmt）は生成した新しいエクスポート文や型定義を整形し直す可能性があるため、検証手順は `format → lint → typecheck → build → test` の順にすべき。
- `oxlint-disable-next-line typescript/consistent-type-definitions` が効かない場合は、プレフィックスなしの `consistent-type-definitions` を試す。

これらの指摘は kanban ファイルの `## プラン` および本ログの「検証」欄に反映済み。

## 会話内容

1. ユーザーが `/kanban-kit:add-kanban` を実行し、「oxlintの警告・エラーの修正をして欲しい」という要望と「コード品質のために、リントの警告・エラーに対して下記方針に従って実装の修正、oxlintの設定変更を行ってほしい」という目的を伝えた。この時点では「下記方針」の具体的な内容は引数に含まれておらず、Claude は `kanban/0003_fix_oxlint_findings/0003_fix_oxlint_findings.md` を目的・要望のみで作成し、要望欄が簡潔である旨をユーザーに伝えた。
2. Claude が「続けて `/kanban` を実行しますか？」と確認したところ、ユーザーは「いいえ（後で実行する）」を選択した。
3. その後ユーザー（または連携ツール）が kanban ファイルに `## 方針` セクションを追記し、one-var・func-style・no-named-export・sort-keys・group-exports・consistent-type-definitions・prefer-expect-assertions・no-magic-numbers・method-signature-style・no-importing-vitest-globals・exports-last・capitalized-comments・array-type の13ルールについて、それぞれ「コードを直すべきか」「oxlint設定を変えるべきか」の具体的な指示を記載した（ファイルの `on disk` 変更として検知）。
4. ユーザーが `/kanban-kit:kanban 0003` を実行し、タスク0003の実行を指示した。
5. Claude はまず `ls kanban/` で採番を確認（0002が最大のため対象は0003と確定済み）、EnterPlanMode でプランモードに入った。
6. Explore サブエージェントを1体起動し、`.oxlintrc.json`・`package.json`・`tsconfig.json`系・`src/`全ファイル・`test/`全ファイル・`vitest.config.ts`・`npm run lint`の実行結果・`.claude/settings.json`を調査させた。エージェントは59件の警告を全てルール別・ファイル別に集計し、13ルールで説明可能であることを確認して報告した。
7. Claude は追加調査として、oxlintの `.oxlintrc.json` の設定構文（ルール名のプレフィックス規則、`overrides`の存在、インライン無効化コメントの構文）を `node_modules/oxlint/configuration_schema.json` と oxc.rs のドキュメント（WebFetch）で確認した。特に `consistent-type-definitions`、`method-signature-style`、`array-type`、`no-magic-numbers`、`capitalized-comments`、`sort-keys`、`no-importing-vitest-globals`、`no-default-export`、`no-named-export`、`exports-last`、`group-exports` の各ルールのオプション・デフォルト値をドキュメントおよび（`no-importing-vitest-globals` については）oxc本体のRustソースコードで直接確認した。
8. 調査の過程で以下の重要な事実を発見した:
   - `no-importing-vitest-globals` はオプションを持たないstatelessなルールであり、`globals: false` かどうかに関わらず常に発火する。これは「`globals: false`としてimportをする形式にして欲しい」という方針と技術的に相容れないため、ルールを無効化する方針とした。
   - `vitest.config.ts` は `export default defineConfig({...})` という default export を使っているため、`import/no-default-export` をグローバルに有効化すると自己矛盾（設定ファイル自体がエラーになる）が生じる。`overrides` で `vitest.config.ts` のみ除外する必要がある。
   - `capitalized-comments` の実際の警告対象コメント（`// crypto.subtle だけでは...`）は英字小文字のAPI名で始まっており、日本語文字判定だけの `ignorePattern` では正しく除外できない。ルール自体を無効化する方針とした。
9. Claude はこれらの調査結果をもとに実装プランを作成し、plan mode のシステム制約（プランモード中は指定されたプランファイルのみ編集可能）に従って `/Users/natsume.yuta/.claude/plans/nifty-spinning-curry.md` にプランを記述した。
10. advisor ツールでプランのレビューを受け、上記「プランニング経緯」に記載した4点の指摘（`no-default-export`の動作確認、`test/**` globの動作確認、`group-exports`のフォールバック、`format`実行順序）を得た。指摘内容はいずれもプランの方向性を覆すものではなく、検証手順の強化として反映した。
11. ExitPlanMode でユーザーの承認を得た（リジェクトなし、フィードバックなしで初回提案がそのまま承認）。
12. plan mode 終了後、Claude はまず承認されたプラン内容を kanban ファイル本文の `## プラン` セクションに転記し、続けて本ログファイル（`log.md`）を作成した。

## 編集したファイル

- `.oxlintrc.json`: `rules` に `one-var`, `func-style`, `prefer-arrow-callback`, `import/no-named-export`, `import/no-default-export`, `typescript/consistent-type-definitions`, `vitest/no-importing-vitest-globals`, `capitalized-comments` を追加。`overrides` に `test/**`（`no-magic-numbers: off`）と `vitest.config.ts`（`import/no-default-export: off`）を追加。
- `vitest.config.ts`: `test` に `globals: false` を明示追加（コメント付き）。
- `src/crypto.ts`:
  - `Uint8ArrayBase64Options` / `Uint8ArrayFromBase64Options` を `interface` → `type`（intersection）に変換。
  - `Uint8ArrayWithBase64` / `Uint8ArrayConstructorWithBase64` は `interface` を維持し、直前に `// oxlint-disable-next-line typescript/consistent-type-definitions` を追加。メソッドシグネチャ（`toBase64(...)`, `fromBase64(...)`）をプロパティ関数型シグネチャ（`toBase64: (...) => ...`）に変更。
  - `lengthIv = 12` という名前付き定数を追加し、`encryptByApi` 内の `new Uint8Array(12)` を `new Uint8Array(lengthIv)` に置き換え。
  - `type AllKeyUsages = "encrypt" | "decrypt" | ... ;` を追加し、`KeyConfig.keyUsages` の型を `Array<...>` から `AllKeyUsages[]` に変更。
  - `crypto.subtle.generateKey`/`encrypt`/`decrypt` に渡すオブジェクトリテラルのキー順をアルファベット順（`length`/`iv` が先、`name` が後）に修正（3箇所）。
  - `generateKey` / `importKey` / `encrypt` / `decrypt`（関数）と `PropsEncrypt` / `PropsDecrypt`（型）から個別の `export` を外し、ファイル末尾に `export { generateKey, importKey, encrypt, decrypt };` と `export type { PropsEncrypt, PropsDecrypt };` をまとめて追加。
- `test/runtime.test.ts`:
  - 2つの `it(...)` ブロック先頭に `expect.hasAssertions();` を追加。
  - `crypto.subtle.generateKey`/`encrypt`/`decrypt` に渡すオブジェクトリテラルのキー順をアルファベット順に修正（3箇所）。
- `CLAUDE.md`: 「oxlint の警告はノイズ」節を「oxlint は warning も含めて 0 件が基準」に書き換え、個別ルールの override 内容と「現在は0件が正常」という事実を記載。
- （副作用）`npm run format`（oxfmt）が `kanban/0001_fix_typecheck_errors/` 配下の既存ファイルにも見出し直後の空行を1行ずつ挿入する整形をかけた。内容の変更はなく空行追加のみ（`git diff` で確認済み）。今回のタスクとは無関係だが oxfmt がリポジトリ全体を対象にするため発生したもので、意図的な変更ではない。

## 実行したコマンド

1. `ls kanban/ 2>/dev/null | grep -E '^[0-9]{4}_' | sort | tail -1` — 採番確認（`/kanban-kit:add-kanban` フェーズ）
2. `npx oxlint --rules` / `npx oxlint --help` — `--rules` フラグは存在しないことを確認
3. `find node_modules/oxlint -iname "*.json"` / Python での `configuration_schema.json` 読み込み — `rules`/`overrides` のスキーマ形状を確認
4. `npx oxlint -c /tmp/oxlintrc.no-override.json`（`vitest.config.ts` 用 override を除いた一時設定） — `import/no-default-export` が実際に `vitest.config.ts:4:8` でエラー検出されることを確認してから本設定に override を追加
5. `npm run format`（oxfmt） — 全体整形
6. `npm run lint`（oxlint） — 変更前59件 → 変更後 **0件**（exit code 0）
7. `npm run typecheck`（`tsc -p tsconfig.test.json`） — エラーなし
8. `npm run build`（`tsc`） — エラーなし
9. `npm test`（`vitest run`） — 2 passed（既存テストに変更なし、`expect.hasAssertions()` 追加のみ）
10. `git diff --stat` — 最終変更ファイル一覧を確認

## 判断・意思決定

- **`consistent-type-definitions` の interface/type 分割**: ユーザー方針は「原則type、Uint8Arrayに toBase64/fromBase64 を生やす必要がある箇所だけinterface」。文字通り解釈すると、実際に `extends Uint8Array<ArrayBuffer>` / `extends Uint8ArrayConstructor` している `Uint8ArrayWithBase64` / `Uint8ArrayConstructorWithBase64` の2つだけが該当し、オプション型（`Uint8ArrayBase64Options` / `Uint8ArrayFromBase64Options`）は `extends` の技術的必然性がないため `type` に変換した。plan mode で advisor に確認済みで、ユーザーにも ExitPlanMode でこの解釈を明示した上で承認を得た。
- **`capitalized-comments` を ignorePattern ではなく完全に off にした**: 当初 Web ドキュメントで `ignorePattern`（日本語文字始まりを除外する正規表現）を検討したが、実際に警告が出ていたコメント `// crypto.subtle だけでは...` は英字小文字のAPI名で始まっており、単純な「先頭が日本語文字か」の判定では除外しきれないと判明。要望が「警告を表示しないように設定変更」だったため、ルール自体を `off` にする方が確実かつシンプルと判断した。
- **`vitest/no-importing-vitest-globals` を off にした根拠**: oxc本体のRustソースを直接確認し、このルールが `globals` 設定の値に関わらず常に発火する stateless なルールだと判明したため。「`globals: false` としてimportをする形式にして欲しい」という方針は、コード上明示的に `globals: false` を設定しつつ import を続けることと解釈し、ルールとの根本的な非互換性から off にした。
- **`import/no-default-export` を有効化する前に単体で動作確認した**: advisor の指摘を受け、`vitest.config.ts` 用 override を同時に追加すると発火の確認ができないため、一時的に override なしの設定ファイルで oxlint を実行し、実際にエラーが出ることを確認してから本設定に override を追加した。
- **`overrides` の `files: ["test/**"]` をそのまま採用**: `npm run lint` 実行後に `test/runtime.test.ts:15` の `no-magic-numbers` 警告が実際に消えていることを確認できたため、`test/**/*.ts` への変更は不要だった。
- **group-exports を「値エクスポート1文＋型エクスポート1文」の2文構成にした**: `npm run lint` 実行後に `group-exports` 警告が残っていないことを確認できたため、1文にまとめるフォールバックは不要だった。
- **`oxlint-disable-next-line typescript/consistent-type-definitions`（プレフィックスあり）で問題なく機能した**: lint実行後に該当箇所の警告が残っていないことを確認済みで、プレフィックスなしへのフォールバックは不要だった。

## エラー・問題

特になし。プラン通りの変更で `npm run lint` が一発で0件（warning/error とも）になり、`typecheck`/`build`/`test` もすべて成功した。advisor の指摘に基づき用意していた4つのフォールバック（`test/**/*.ts` への変更、`group-exports` の1文統合、`consistent-type-definitions` の非プレフィックス版、`no-default-export` の単体確認）はいずれも発動せず、最初の設計のまま通った。

## 完了日時

2026-09-26T05:07:54+09:00

(未完了)
