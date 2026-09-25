# oxlint 実行結果まとめと各ルールの根拠調査

- **実行日時**: 2026-09-26T04:01:35+09:00
- **実行コマンド**: `npx oxlint`（`package.json` の `npm run lint` と同一）
- **総括**: エラー 0件、警告 59件、13種類のルールが該当。CLAUDE.md に記載の通り `.oxlintrc.json` は `correctness`/`suspicious` を `error`、`perf`/`style` を `warn` に設定しており、今回検出された13ルールはすべて `warn`（=既存の状態として許容されているもの）である。

## サマリー表

| ルール                      | プラグイン | 件数 | 対象ファイル                        |
| --------------------------- | ---------- | ---- | ----------------------------------- |
| one-var                     | eslint     | 15   | src/crypto.ts, test/runtime.test.ts |
| func-style                  | eslint     | 9    | src/crypto.ts                       |
| no-named-export             | import     | 8    | src/index.ts, src/crypto.ts         |
| sort-keys                   | eslint     | 6    | src/crypto.ts, test/runtime.test.ts |
| group-exports               | import     | 6    | src/crypto.ts                       |
| consistent-type-definitions | typescript | 5    | src/crypto.ts                       |
| prefer-expect-assertions    | vitest     | 2    | test/runtime.test.ts                |
| no-magic-numbers            | eslint     | 2    | src/crypto.ts, test/runtime.test.ts |
| method-signature-style      | typescript | 2    | src/crypto.ts                       |
| no-importing-vitest-globals | vitest     | 1    | test/runtime.test.ts                |
| exports-last                | import     | 1    | src/crypto.ts                       |
| capitalized-comments        | eslint     | 1    | test/runtime.test.ts                |
| array-type                  | typescript | 1    | src/crypto.ts                       |

---

## one-var (eslint)

**該当箇所一覧**:

- `test/runtime.test.ts:15,16,18,19`
- `src/crypto.ts:19,20,21,32,49,66,88,99,100,114,115`

**ルールの意図**: 同じスコープ内で複数の変数宣言（`var`/`let`/`const`）が並んでいる場合に、それらを1つの宣言文にまとめるか、常に分離するかをプロジェクト全体で統一させるルール。

**なぜダメとされるか**: ES6以前は関数スコープしか存在せず、`var` は宣言位置に関わらず関数の先頭までホイストされるため、「宣言をまとめて先頭に置く」ことでスコープの混乱を避けようとする思想がある。ESLint公式ドキュメントは「単一宣言派」と「複数宣言派」の両方の立場を認めつつ、プロジェクトとしてどちらかに統一することを本ルールの目的としている。つまり正誤の問題ではなく、一貫性の担保が狙い。

**参考リンク**: https://eslint.org/docs/latest/rules/one-var

**このリポジトリでの該当箇所**: `src/crypto.ts` では `const encoder = ...` `const decoder = ...` `const algorithmName = ...` `const lengthKey = ...`（19-21行目）のように、隣接する独立した `const` 宣言を意図的に1行ずつ分けて書いており、oxlint のデフォルト設定（隣接する `const` は1つの宣言文にまとめるべき、という挙動）と衝突している。

---

## func-style (eslint)

**該当箇所一覧**:

- `src/crypto.ts:30,43,47,63,80,86,92,97,109`

**ルールの意図**: 関数の定義方法を「関数宣言（`function foo() {}`）」か「関数式（`const foo = function() {}` / アロー関数）」のどちらかに統一する。

**なぜダメとされるか**: 両者は**ホイスティング挙動が異なる**。関数宣言は定義前に呼び出せるが、関数式（`const`/`let` に代入）は定義行に到達するまで呼び出せない（TDZ にかかる）。この違いを認識せずに混在させると、コードの実行順序に対する誤解を招きうる。ESLint公式ドキュメントはデフォルトを `"expression"`（関数式を強制）としている。

**参考リンク**: https://eslint.org/docs/latest/rules/func-style

**このリポジトリでの該当箇所**: `src/crypto.ts` の `generateKeyByApi`, `exportKeyByApi`, `importKeyByApi`, `encryptByApi`, `decryptByApi` および公開API (`generateKey`, `importKey`, `encrypt`, `decrypt`) はすべて `function` 宣言（`async function foo() {}` 含む）で統一して書かれている。これはデフォルト設定（関数式を要求）と逆方向でリポジトリ側が一貫しているため、警告自体は「関数式に変えよ」という指摘だが、実態はこのリポジトリ内で関数宣言スタイルに統一されている。

---

## no-named-export (import)

**該当箇所一覧**:

- `src/index.ts:1,2`
- `src/crypto.ts:53,86,92,97,104,109`

**ルールの意図**: モジュールが named export（`export const foo`, `export function foo`, `export { foo }` など）を持つことを禁止し、`export default` への統一を強制する。`no-default-export` ルールの逆の思想。

**なぜダメとされるか**: eslint-plugin-import の公式ドキュメントには明確な理由の文章はないが、「モジュールごとに単一の公開エントリポイントを持たせる」設計思想に基づく。default export に統一すると import 側の記述が単純化される一方、named export はモジュールが複数の関心事をエクスポートしていることを許容してしまう。

**参考リンク**: https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-named-export.md

**このリポジトリでの該当箇所**: `src/index.ts` は `export { generateKey, importKey, encrypt, decrypt } from "./crypto.ts"` のように、意図的に複数の関数・型を named export として公開APIにしている（CLAUDE.md の「公開API」セクションに明記された設計）。このライブラリは単一のデフォルトオブジェクトではなく複数の独立した関数を提供する設計であるため、本ルールの前提（1モジュール1エクスポート）とは根本的に相容れない。

---

## sort-keys (eslint)

**該当箇所一覧**:

- `test/runtime.test.ts:11,18,19`
- `src/crypto.ts:34,67,81`

**ルールの意図**: オブジェクトリテラルのプロパティ定義がアルファベット順（デフォルトは昇順・大文字小文字区別）に並んでいるかを検査する。

**なぜダメとされるか**: 公式ドキュメントでは「プロパティ名をアルファベット順に並べることで、後から必要なプロパティを探しやすくなり、diff（差分比較）も追いやすくなる」という開発者の意見を根拠として挙げている。一方でソート順の維持自体がコストになるという反対意見も同ドキュメント内で言及されている。

**参考リンク**: https://eslint.org/docs/latest/rules/sort-keys

**このリポジトリでの該当箇所**: `crypto.subtle.generateKey({ name: algorithmName, length: lengthKey }, ...)` のように、Web Crypto API の `AlgorithmIdentifier`（`{ name, length }` や `{ name, iv }`）をアルファベット順ではなく意味的な優先度（`name` を先頭に）で書いている。Web Crypto API のドキュメントやサンプルコードの慣例（`name` を最初に書く）に合わせた結果、アルファベット順とは逆になっている。

---

## group-exports (import)

**該当箇所一覧**:

- `src/crypto.ts:53,86,92,97,104,109`

**ルールの意図**: 同一ファイル内に複数の named export 宣言（または複数の `module.exports` 代入）が散らばっている場合に検出し、単一の `export { ... }` にまとめることを推奨する。

**なぜダメとされるか**: 公式ドキュメントでは「export 宣言はファイル内のどこにでも現れうるため、単一の export 宣言に集約することで、そのモジュールが何をエクスポートしているかを一目で確認できるようにする」ことを根拠としている。エクスポートが分散していると、モジュールの公開インターフェース全体を把握するのに全文を読む必要が生じる。

**参考リンク**: https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/group-exports.md

**このリポジトリでの該当箇所**: `src/crypto.ts` は `export type PropsEncrypt`（53行目）、`export async function generateKey`（86行目）、`export async function importKey`（92行目）、`export async function encrypt`（97行目）、`export type PropsDecrypt`（104行目）、`export async function decrypt`（109行目）と、型と関数の export が定義位置ごとに個別に書かれている。関数・型の定義と export を同じ場所に書くスタイル（1関数=1export文）を採用しているため、まとめて1箇所に集約するスタイルとは相容れない。

---

## consistent-type-definitions (typescript)

**該当箇所一覧**:

- `src/crypto.ts:23,53,58,74,104`

**ルールの意図**: オブジェクト型の定義を `interface` と `type` のどちらか一方の記法に統一する。

**なぜダメとされるか**: typescript-eslint 公式ドキュメントでは主に3点を根拠として挙げている。(1) 記法統一によるコードベース全体の可読性向上。(2) 複雑な型において `interface` の方が型チェッカーの処理が効率的な場合がある（ただし実務上ほぼ問題にならないと明記）。(3) `interface` は同名の再宣言によるマージ（declaration merging）が可能だが `type` は不可、というセマンティクスの違い。デフォルト値は `interface`（TypeScriptコミュニティで最も一般的なスタイルであるため）。

**参考リンク**: https://typescript-eslint.io/rules/consistent-type-definitions/

**このリポジトリでの該当箇所**: `src/crypto.ts` では `KeyConfig`, `PropsEncrypt`, `OutputEncryptByApi`, `PropsDecryptByApi`, `PropsDecrypt` をすべて `type` で定義している。CLAUDE.md 冒頭の `Uint8ArrayBase64Options` 等は `interface` で定義されている一方、関数の引数・戻り値の型は `type` で書かれており、ファイル内でも記法が混在している。

---

## prefer-expect-assertions (vitest)

**該当箇所一覧**:

- `test/runtime.test.ts:4,10`

**ルールの意図**: 各テストケースの最初の式として `expect.assertions(<number>)` または `expect.hasAssertions()` を要求する。

**なぜダメとされるか**: 公式ドキュメント（vitest-dev/eslint-plugin-vitest）には詳細な根拠文は明記されていないが、テスティングの一般的なベストプラクティスとして、非同期処理やコールバック内の `expect` は、実行されずにテストが「グリーン」のまま終了してしまうケースがある（アサーションが1つも実行されなくてもテスト自体は失敗しない）。`expect.assertions(n)` を先頭で宣言しておくことで、期待した回数だけアサーションが実際に実行されたかどうかをVitestが検証できるようになり、「アサーションが実行されずに素通りしてテストが偽陽性で成功する」事故を防げる。

**参考リンク**: https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/prefer-expect-assertions.md

**このリポジトリでの該当箇所**: `test/runtime.test.ts` の2つの `it(...)` はいずれも `expect.hasAssertions()` 等を呼ばずに直接 `expect(...)` から書き始めている。特に2つ目のテスト（10-22行目）は `crypto.subtle.generateKey` 等の非同期呼び出しを複数経由しており、途中で例外的に early return するような変更が将来入った場合、アサーションが1つも実行されずにテストが緑のまま通過するリスクがある。

---

## no-magic-numbers (eslint)

**該当箇所一覧**:

- `test/runtime.test.ts:15`
- `src/crypto.ts:64`

**ルールの意図**: コード中に直接埋め込まれた数値リテラル（マジックナンバー）を検出し、名前付き定数への置き換えを促す。

**なぜダメとされるか**: 公式ドキュメントは「特別な意味を持つ数値は、その意図を明示するために定数として宣言すべき」としている。数値がそのまま埋め込まれていると、後からコードを読む人がその数値の意味（なぜその値なのか）を文脈から推測する必要があり、変更時に同じ数値が複数箇所に散らばっていると修正漏れが起きやすい。

**参考リンク**: https://eslint.org/docs/latest/rules/no-magic-numbers

**このリポジトリでの該当箇所**: `crypto.getRandomValues(new Uint8Array(12))` の `12` は AES-GCM の IV 長（12バイト＝96ビット、NIST SP 800-38D 推奨値）という重要な暗号パラメータだが、コード上は裸の数値リテラルとして埋め込まれている。`test/runtime.test.ts` 側も同じ `12` を独立して埋め込んでいるため、本来最も「意味を持つ定数化が有効なケース」に該当する。

---

## method-signature-style (typescript)

**該当箇所一覧**:

- `src/crypto.ts:11,15`

**ルールの意図**: インターフェース/型内の関数プロパティを「メソッドシグネチャ」（`foo(arg: string): number;`）ではなく「プロパティシグネチャ」（`foo: (arg: string) => number;`）で統一して書くことを強制する（デフォルトは `"property"`）。

**なぜダメとされるか**: TypeScript の型チェックにおいて、メソッドシグネチャの引数は常に**双変（bivariant）**にチェックされるのに対し、プロパティシグネチャ（関数型のプロパティ）は `strictFunctionTypes` コンパイラオプション有効時に**反変（contravariant）**でチェックされる。つまりメソッドシグネチャで書くと、本来型エラーになるべき不整合な関数の代入がすり抜けてしまう可能性があり、プロパティシグネチャの方が厳密で安全な型チェックが働く。

**参考リンク**: https://typescript-eslint.io/rules/method-signature-style/

**このリポジトリでの該当箇所**: `Uint8ArrayWithBase64` インターフェース（10-12行目）の `toBase64(options?: Uint8ArrayBase64Options): string;` と、`Uint8ArrayConstructorWithBase64` インターフェース（14-16行目）の `fromBase64(...)` はいずれもメソッドシグネチャで宣言されている。CLAUDE.md に記載の通りこれらは TC39 の Uint8Array base64 メソッドが標準の型定義に未収録なため自前で宣言している暫定コードであり、型安全性より Web Crypto API 由来の自然な記法（メソッド構文）を優先した結果と考えられる。

---

## no-importing-vitest-globals (vitest)

**該当箇所一覧**:

- `test/runtime.test.ts:1`

**ルールの意図**: `describe`/`it`/`expect` 等の Vitest グローバル関数を `import` 文や `require` で明示的にインポートすることを禁止する。oxlint の公式ドキュメント（oxc.rs）は「プロジェクトが Vitest の関数をグローバルとして提供するよう設定されている場合、このルールを使うことで、グローバルが import/require 経由で決してインポートされないことを保証できる」と説明している。

**なぜダメとされるか**: このルールは Vitest 設定で `globals: true` を有効にしているプロジェクト専用のルールであり、「グローバルとして使えるはずの関数を、わざわざ import する二重の書き方」を防ぐことが目的。公式ドキュメントは明確に **"When Not To Use It: このルールは Vitest 設定の `globals` オプションが `false`（デフォルト）の場合は使用すべきではない"** と明記している。

**参考リンク**: https://oxc.rs/docs/guide/usage/linter/rules/vitest/no-importing-vitest-globals

**このリポジトリでの該当箇所（重要）**: `test/runtime.test.ts:1` は `import { describe, expect, it } from "vitest";` と明示的にインポートしている。一方 CLAUDE.md には「`globals: true` は typecheck を壊すため使わない。テストは vitest のヘルパーを明示的に import する必要がある」と明記されており、このプロジェクトは **意図的に `globals: false`（デフォルト）を維持し、vitest ヘルパーを明示 import する設計**を選択している。つまりこのルールが前提とする「globals: true のプロジェクト」という適用条件そのものに、このリポジトリは該当しない。ルールの "When Not To Use It" に正面から当てはまるケースであり、他の12ルールと異なり「設計判断とルールの前提が構造的に矛盾している」典型例。

---

## exports-last (import)

**該当箇所一覧**:

- `src/crypto.ts:53`

**ルールの意図**: ES Modules の `export` 文が、通常の文（変数宣言や関数定義など）に混ざって書かれている場合を検出し、すべての export をファイル末尾にまとめることを推奨する。

**なぜダメとされるか**: 公式ドキュメントには明示的な rationale の記載はないが、一般的な背景として「モジュールの実装本体」と「公開インターフェース（何をエクスポートするか）」を分離することで、ファイルの構成が「内部実装 → 公開部分」という一貫した流れになり、モジュールが何を外部に公開しているかをファイル末尾だけ見れば把握できるようになる、という考え方に基づく。

**参考リンク**: https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/exports-last.md

**このリポジトリでの該当箇所**: `src/crypto.ts:53` の `export type PropsEncrypt = {...}` の後に、非exportの `type OutputEncryptByApi`（58行目）や `async function encryptByApi`（63行目）などが続いている。型定義・内部ヘルパー・公開APIが実行順（内部で使う順）に並べられているため、"公開部分を末尾に集約する" というルールの前提とは異なる構成になっている。

---

## capitalized-comments (eslint)

**該当箇所一覧**:

- `test/runtime.test.ts:5`

**ルールの意図**: コメントの先頭文字が大文字か小文字かの一貫性を強制する（デフォルトはコメント先頭を大文字にすることを要求）。数字や記号、eslint向けの設定コメントなどは対象外。

**なぜダメとされるか**: 公式ドキュメントは「コメント形式の一貫性がプロジェクトの保守性を高める」ことを根拠としている。チーム全体でコメントのスタイルを統一することで、レビュー時の認知負荷を下げる狙いがある。

**参考リンク**: https://eslint.org/docs/latest/rules/capitalized-comments

**このリポジトリでの該当箇所**: `test/runtime.test.ts:5` のコメント `// crypto.subtle だけでは Node でも通ってしまうため、` は日本語コメントであり、英字の大文字小文字という概念が本来当てはまらない。ただし行頭が半角スラッシュ+スペースの直後に日本語文字（非ASCII文字）が来ており、このルールは英字を対象とした判定のため日本語コメントに対しても機械的に警告している。

---

## array-type (typescript)

**該当箇所一覧**:

- `src/crypto.ts:25`

**ルールの意図**: TypeScript の配列型を `T[]` 記法と `Array<T>` 記法のどちらかに統一する（デフォルトは `T[]` を強制する `"array"` オプション）。

**なぜダメとされるか**: 公式ドキュメントは「コードベース全体で同じスタイルを一貫して使うことで、開発者が配列型を読み書きしやすくなる」ことを根拠に挙げている。機能的な差異はなく、純粋にスタイル・可読性の問題として扱われている。

**参考リンク**: https://typescript-eslint.io/rules/array-type/

**このリポジトリでの該当箇所**: `KeyConfig` 型の `keyUsages` プロパティ（25-27行目）は `Array<"encrypt" | "decrypt" | ... >` とユニオン型を `Array<T>` 記法で包んでいる。ユニオン型を `T[]` 記法で書くと `("encrypt" | "decrypt" | ...)[]` のように括弧が必要になり視覚的にやや煩雑になるため、`Array<T>` 記法が選ばれたと考えられる。

---

## 本ドキュメントのスコープ

本ドキュメントは、現時点（2026-09-26）で `npx oxlint` が報告する13種類・59件の警告について、各ルールが「何を検出し」「なぜそのルールが存在するのか」を一次情報に基づいて整理したものである。**各警告について、このリポジトリのコードを実際に修正すべきか、それとも意図的な設計判断として許容すべきかの判断は本ドキュメントの範囲外とし、行わない。** 判断はユーザー自身が、本ドキュメントの内容とプロジェクトの設計方針（CLAUDE.md 記載の制約など）を踏まえて行うこと。
