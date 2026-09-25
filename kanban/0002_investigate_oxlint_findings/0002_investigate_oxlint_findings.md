# oxlintの警告・エラー調査

## 目的

oxlintで色々出てるけど、何があるのか、なんでダメなのかを詳しく知りたい。知らないことには除外してその書き方を許容すべきか、修正すべきかを判断できないため。

## 要望

oxlint実行時のエラーと警告に何があるのかをまとめて。また各エラーと警告について、なぜその書き方がダメなのか具体的にしらべて追記して。

---

## プラン

- `npx oxlint` を実行し、検出されるエラー・警告を全件取得・集計する。
- 検出された各ルール（プラグイン別）について、ESLint / typescript-eslint / eslint-plugin-import / eslint-plugin-vitest / oxc(oxlint) の公式ドキュメントを調査し、「何を検出するか」「なぜその書き方が問題とされるのか」を一次情報ベースでまとめる。
- 調査結果は `kanban/0002_investigate_oxlint_findings/oxlint-findings.md` に新規作成する。各警告を許容すべきか修正すべきかの判断は本タスクでは行わず、ユーザーの判断材料を揃えることに限定する。
- 採用理由: リポジトリに `docs/` の慣習がなく、本調査は現時点のコードに紐づくスナップショットであるため、恒久ドキュメントではなくタスクディレクトリ配下の成果物として扱うのが実態に即している。

---

## 完了サマリー

- **完了日時**: 2026-09-26T04:03:16+09:00
- **対応内容**:
  - `npx oxlint` を実行し、エラー0件・警告59件（13種類のルール）であることを確認した。
  - 検出された13ルール（one-var, func-style, no-named-export, sort-keys, group-exports, consistent-type-definitions, prefer-expect-assertions, no-magic-numbers, method-signature-style, no-importing-vitest-globals, exports-last, capitalized-comments, array-type）それぞれについて、ESLint公式・typescript-eslint公式・eslint-plugin-import公式・oxc(oxlint)公式ドキュメントを調査し、「何を検出するか」「なぜダメとされるか」を一次情報ベースで整理した。
  - 各ルールについて、このリポジトリの該当コード箇所と、なぜそこで警告が出ているのかの具体的な解説も付記した。
  - 特筆点: `vitest(no-importing-vitest-globals)` は oxc 公式ドキュメントに「Vitest の `globals: true` 設定時専用のルールであり、`globals: false`（デフォルト）の場合は使うべきではない」と明記されている。このリポジトリは CLAUDE.md の方針により意図的に `globals: false` を維持しているため、本ルールの適用条件そのものと構造的に矛盾している。
  - 各警告を「許容する」か「修正する」かの判断は本タスクの範囲外とし、行っていない。
- **変更ファイル**:
  - `kanban/0002_investigate_oxlint_findings/oxlint-findings.md`（新規作成、成果物）
  - `kanban/0002_investigate_oxlint_findings/log.md`（新規作成、作業ログ）
  - `kanban/0002_investigate_oxlint_findings/0002_investigate_oxlint_findings.md`（本ファイル、プラン・完了サマリー追記）
- **備考**: 成果物は `kanban/0002_investigate_oxlint_findings/oxlint-findings.md` を参照。コード（`src/`, `test/`）の変更は行っていない。
