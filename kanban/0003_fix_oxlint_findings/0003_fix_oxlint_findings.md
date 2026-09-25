# oxlintの警告・エラー修正

## 目的

コード品質のために、リントの警告・エラーに対して下記方針に従って実装の修正、oxlintの設定変更を行ってほしい

## 要望

oxlintの警告・エラーの修正をして欲しい

## 方針

### one-var (eslint)

常に分離するようにして欲しい。
実装が分離するようにしているのでoxlintの設定を変更してほしい。

### func-style (eslint)

一旦下記方針とする。
現実装でこの設定で問題があるのなら、それも修正してほしい。

```json
{
  "rules": {
    "func-style": ["error", "declaration"],
    "prefer-arrow-callback": "error"
  }
}
```

### no-named-export (import)

default exportを禁止してnamed exportのみに制限したい。

### sort-keys (eslint)

このルールに従い、プロパティ定義をアルファベット順にして欲しい。

### group-exports (import)

ファイル末尾でのgroup exportsに修正して欲しい。

### consistent-type-definitions (typescript)

原則typeを使う。
Uint8Arrayに `toBase64()` と `fromBase64()` を生やす必要があるので、そこだけはinterfaceにしたい。

### prefer-expect-assertions (vitest)

このルールに従ってテストの実装を修正してほしい。

### no-magic-numbers (eslint)

テストコード(`test/runtime.test.ts`)ではマジックナンバーを許容しつつ、実装上は名前付き定数を使うことを強制して欲しい。

### method-signature-style (typescript)

プロパティシグネチャに修正してほしい。

### no-importing-vitest-globals (vitest)

`globals: false` としてimportをする形式にして欲しい。

### exports-last (import)

末尾でexportするようにして欲しい。

### capitalized-comments (eslint)

日本語コメントを許容したいので警告を表示しないように設定を変更してほしい。

### array-type (typescript)

arrayを使うようにして欲しい。
`keyUsage` プロパティに対しては 事前に `type AllKeyUsages = "encrypt" | ...` のように書いて `keyUsage: AllKeyUsages[]` として欲しい。

## プラン

### Context

`npm run lint`（oxlint 1.85.0）は現状 **59件の warning**（error は 0）を出している。`.oxlintrc.json` は `categories.style: "warn"` の一括設定のみで、個別ルールの override が一切ない。上記「方針」に列挙された13種類の oxlint ルールで59件全てが説明できる（内訳: one-var 15件, func-style 9件, no-named-export 8件, group-exports 6件, sort-keys 6件, consistent-type-definitions 5件, prefer-expect-assertions 2件, method-signature-style 2件, no-magic-numbers 2件, no-importing-vitest-globals 1件, array-type 1件, exports-last 1件, capitalized-comments 1件）。方針通りに対応すれば lint の警告は0件になる見込み。

### 調査で確認した事実

- `.oxlintrc.json` は `plugins: ["typescript", "unicorn", "oxc", "import", "vitest"]`、`categories: {correctness: error, suspicious: error, perf: warn, style: warn}`、`rules: {}`（override なし）。
- oxlint はESLint v8互換の設定形式で、コア(eslint)ルールはプレフィックスなし（例: `one-var`）、プラグイン由来ルールは `<plugin>/<rule>` 形式（例: `import/no-named-export`）で `.oxlintrc.json` の `rules` に書く。
- `.oxlintrc.json` は `overrides`（`files` glob ごとに `rules` を上書き）をサポートしている（`node_modules/oxlint/configuration_schema.json` の `OxlintOverride` で確認）。
- インラインの無効化コメントは `// oxlint-disable-next-line <plugin>/<rule>` 形式。
- `vitest/no-importing-vitest-globals` ルールは**設定オプションを一切持たない stateless なルール**（oxc本体の Rust 実装 `NoImportingVitestGlobals` を確認済み）。vitest.config.ts の `globals` 設定の実際の値に関わらず、`from "vitest"` の named import を常に警告する。CLAUDE.md が明言する「`globals: true` は typecheck を壊すので明示 import が必要」という設計方針とはこのルールが根本的に相容れないため、無効化する。
- `import/no-default-export` は import プラグインのルールとして存在するが、デフォルトでは有効になっていない。`no-named-export` を無効化し、代わりにこのルールを有効化することで「named exportのみ許可・default export禁止」を実現する。
- **重要**: `vitest.config.ts` は `export default defineConfig({...})` という default export を使っている（Vite/Vitest の設定ファイル仕様上必須）。`import/no-default-export` をグローバルに有効化すると `vitest.config.ts` がエラーになるため、`overrides` で `vitest.config.ts` だけ除外する。
- `src/crypto.ts` の `Uint8ArrayBase64Options` / `Uint8ArrayFromBase64Options` は単なるオプションの型で `extends` の必然性がなく `type` に変換可能。一方 `Uint8ArrayWithBase64`（`extends Uint8Array<ArrayBuffer>`）と `Uint8ArrayConstructorWithBase64`（`extends Uint8ArrayConstructor`）は組み込み型を拡張して `toBase64`/`fromBase64` を生やす宣言であり、方針の「そこだけはinterfaceにしたい」に該当する2つと判断した。

### ルールごとの対応（詳細は log.md 参照）

1. **one-var**: 設定変更のみ。`"one-var": ["warn", "never"]`。既に1文1宣言なのでコード変更不要。
2. **func-style / prefer-arrow-callback**: 設定変更のみ。ユーザー指定JSON `{"func-style": ["error", "declaration"], "prefer-arrow-callback": "error"}` をそのまま追加。コード変更不要。
3. **no-named-export / no-default-export**: 設定変更のみ。`"import/no-named-export": "off"`, `"import/no-default-export": "error"`。`vitest.config.ts` は override で除外。
4. **sort-keys**: コード修正のみ。`src/crypto.ts`（L34, L67, L81）と `test/runtime.test.ts`（L11, L18, L19）のオブジェクトキー順をアルファベット順に修正。
5. **group-exports / exports-last**: コード修正のみ。`src/crypto.ts` の公開関数・型から個別 `export` を外し、ファイル末尾に `export { generateKey, importKey, encrypt, decrypt };` と `export type { PropsEncrypt, PropsDecrypt };` を追加。
6. **consistent-type-definitions**: 設定変更 + 一部コード修正。`"typescript/consistent-type-definitions": ["warn", "type"]`。`Uint8ArrayBase64Options`/`Uint8ArrayFromBase64Options` は `type` に変換、`Uint8ArrayWithBase64`/`Uint8ArrayConstructorWithBase64` は `interface` のまま `oxlint-disable-next-line` を付与。
7. **prefer-expect-assertions**: コード修正のみ。`test/runtime.test.ts` の2つの `it(...)` 先頭に `expect.hasAssertions();` を追加。
8. **no-magic-numbers**: 設定変更 + コード修正。`src/crypto.ts` に `const lengthIv = 12;` を追加し `new Uint8Array(12)` を置き換え。`overrides` で `test/**` は `no-magic-numbers: off`。
9. **method-signature-style**: コード修正のみ。メソッドシグネチャをプロパティ関数型シグネチャに変更。
10. **no-importing-vitest-globals**: 設定変更のみ。`"vitest/no-importing-vitest-globals": "off"`。`vitest.config.ts` の `test` に `globals: false` を明示追加。
11. **capitalized-comments**: 設定変更のみ。`"capitalized-comments": "off"`（ignorePatternでは実際の警告対象コメントを正しく除外しきれないため）。
12. **array-type**: コード修正のみ。`type AllKeyUsages = "encrypt" | ... ;` を追加し `KeyConfig.keyUsages` を `AllKeyUsages[]` に変更。

### `.oxlintrc.json` 最終形（rules / overrides 部分）

```json
"rules": {
  "one-var": ["warn", "never"],
  "func-style": ["error", "declaration"],
  "prefer-arrow-callback": "error",
  "import/no-named-export": "off",
  "import/no-default-export": "error",
  "typescript/consistent-type-definitions": ["warn", "type"],
  "vitest/no-importing-vitest-globals": "off",
  "capitalized-comments": "off"
},
"overrides": [
  { "files": ["test/**"], "rules": { "no-magic-numbers": "off" } },
  { "files": ["vitest.config.ts"], "rules": { "import/no-default-export": "off" } }
]
```

### その他

- CLAUDE.md の oxlint に関する説明（「既存コードには...多数の style 系 warning が残っている」）が対応後は実態と合わなくなるため、簡潔に更新する。

### 検証

以下は「設定したつもりで実は効いていない」リスクがあるため、個別に動作確認してから次に進む:

- `import/no-default-export`: override なしで一度 lint し、`vitest.config.ts` が実際にエラー検出されることを確認してから override を追加する。
- `overrides` の `files: ["test/**"]`: 追加後に `test/runtime.test.ts:15` の `no-magic-numbers` 警告が消えているか確認する。消えなければ `["test/**/*.ts"]` に変更する。
- `group-exports`（値/型を2文に分ける案）: lint実行後に警告が残っていれば `export { generateKey, importKey, encrypt, decrypt, type PropsEncrypt, type PropsDecrypt };` の1文にまとめる。
- `oxlint-disable-next-line typescript/consistent-type-definitions` が効かない場合はプレフィックスなしの `consistent-type-definitions` を試す。

最終確認手順（この順序）: `npm run format` → `npm run lint`（0件確認） → `npm run typecheck` → `npm run build` → `npm test`

## 完了サマリー

完了日時: 2026-09-26T05:07:54+09:00

13種類の oxlint ルール（one-var, func-style/prefer-arrow-callback, no-named-export/no-default-export, sort-keys, group-exports/exports-last, consistent-type-definitions, prefer-expect-assertions, no-magic-numbers, method-signature-style, no-importing-vitest-globals, capitalized-comments, array-type）すべてについて、方針通りに `.oxlintrc.json` の設定変更または `src/crypto.ts` / `test/runtime.test.ts` / `vitest.config.ts` のコード修正を実施。

- `npm run lint`: 変更前59件の warning → 変更後 **0件**（error/warning とも）
- `npm run typecheck` / `npm run build` / `npm test`（2 passed）: すべて成功
- `CLAUDE.md` の oxlint に関する記述も実態に合わせて更新済み

詳細は `log.md` を参照。
