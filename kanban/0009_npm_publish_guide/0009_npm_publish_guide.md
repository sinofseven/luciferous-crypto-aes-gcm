# npm公開ガイド

## 目的
npmでこのプロジェクトを公開するにあたって、ここからどうしていいかがわからない。例えば今はdistがgit管理下にないがnpmで公開するにはdistがあった方がいいとかもわからない。

## 要望
このプロジェクトをnpmで公開するにはここからどうしたらいいかを教えて

## プラン

現状調査の結果、コードは公開可能な状態にほぼ近い。ユーザーの疑問（`dist` が git 管理下にない件）への回答含め、以下を実施する。

**調査で判明した事実**
- `package.json` の `files: ["dist"]` と `scripts.prepublishOnly: "npm run build"` により、`npm publish` 実行時に自動で `tsc` ビルドが走り `dist/` が同梱される。**`dist` を git 管理下に置く必要はない**（現状の運用のままで問題ない）。
- `exports` / `types` / `sideEffects: false` / `publishConfig.access: "public"` / `license` / `repository` など、scoped package を公開するのに必要な設定は既に揃っている。
- `LICENSE`（MIT）・`README.md`（インストール手順・API説明）も既に存在する。
- 環境の `~/.npmrc` はデフォルトレジストリが社内向け `npm.flatt.tech` になっており、公開npm (`registry.npmjs.org`) 向けの認証トークンは別途あるが **現状無効（401）**。ユーザー確認の結果、公開先は公開npmで確定。
- `@luciferous/crypto-aes-gcm` は npm.flatt.tech / registry.npmjs.org のどちらでも未登録（404）で、パッケージ名は空いている。

**対応方針**
1. 誤って社内レジストリに送信されるのを防ぐため、`package.json` に `publishConfig.registry: "https://registry.npmjs.org"` を追記する（唯一のコード変更）。
2. `npm run typecheck` / `npm run lint` / `npm test` / `npm publish --dry-run` で公開前の状態を検証する（実際の publish は行わない）。
3. ユーザー自身が行う必要がある手順（Claude は代行しない）を `## 完了サマリー` に明記する:
   - `npm login --registry https://registry.npmjs.org` で有効な認証に更新する。
   - `@luciferous` organization が npmjs.com に存在しない場合は事前に作成する。
   - 品質ゲート通過後、`npm publish` を実行する。
   - 公開後 `npm view @luciferous/crypto-aes-gcm --registry https://registry.npmjs.org` で確認する。

## 完了サマリー

完了日時: 2026-09-28T18:09:26+09:00

コードは公開npm (registry.npmjs.org) への公開にほぼ十分な状態だった。`package.json` に `publishConfig.registry: "https://registry.npmjs.org"` を1行追加し（環境の既定レジストリが社内向け `npm.flatt.tech` になっているため、誤送信を防ぐ目的）、typecheck / lint / test / `npm publish --dry-run` で公開前の状態を検証済み（全て正常。tarballには `dist/*` + `package.json`/`README.md`/`LICENSE` の計11ファイルのみが同梱されることを確認）。

**`dist` が git 管理下にない件について**: 対応不要。`scripts.prepublishOnly: "npm run build"` により `npm publish` 実行のたびに自動でビルドが走り、`files: ["dist"]` と合わせて常に最新の `dist/` が同梱される。`dist` をコミットする必要はない。

**ここからユーザー自身で行う手順**（Claude が代行しない外部操作）:
1. `npm login --registry https://registry.npmjs.org` を実行し、有効な認証に更新する（環境の既存トークンは無効(401)なことを確認済み）。
2. https://www.npmjs.com/org/luciferous 等で `@luciferous` organization の存在を確認し、なければ https://www.npmjs.com/org/create で作成する。
3. `npm run typecheck && npm run lint && npm test` が通ることを再確認する。
4. `npm publish --dry-run` で同梱ファイルを最終確認する。
5. `npm publish` を実行する（`publishConfig.registry` の設定により公開npmに送信される）。
6. `npm view @luciferous/crypto-aes-gcm --registry https://registry.npmjs.org` で公開内容を確認する。
