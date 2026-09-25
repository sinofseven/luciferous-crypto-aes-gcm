# typecheckエラーの修正

## 目的

typecheckでエラーが出てしまっている。テストを書く以前の問題なので先に修正したい。

## 要望

`npm run typecheck` でエラーが出た。修正してほしい。

## エラー

```

> @luciferous/crypto-aes-gcm@0.0.1 typecheck
> tsc -p tsconfig.test.json

src/crypto.ts(81,66): error TS2322: Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BufferSource'.
  Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'ArrayBufferView<ArrayBuffer>'.
    Types of property 'buffer' are incompatible.
      Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'.
        Type 'SharedArrayBuffer' is not assignable to type 'ArrayBuffer'.
          Types of property '[Symbol.toStringTag]' are incompatible.
            Type '"SharedArrayBuffer"' is not assignable to type '"ArrayBuffer"'.
src/crypto.ts(94,25): error TS2345: Argument of type 'Uint8Array<ArrayBufferLike>' is not assignable to parameter of type 'BufferSource'.
  Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'ArrayBufferView<ArrayBuffer>'.
    Types of property 'buffer' are incompatible.
      Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'.
        Type 'SharedArrayBuffer' is not assignable to type 'ArrayBuffer'.
          Types of property '[Symbol.toStringTag]' are incompatible.
            Type '"SharedArrayBuffer"' is not assignable to type '"ArrayBuffer"'.
src/crypto.ts(111,73): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
src/crypto.ts(112,81): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
src/crypto.ts(113,25): error TS2322: Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BufferSource'.
  Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'ArrayBufferView<ArrayBuffer>'.
    Types of property 'buffer' are incompatible.
      Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'.
        Type 'SharedArrayBuffer' is not assignable to type 'ArrayBuffer'.
          Types of property '[Symbol.toStringTag]' are incompatible.
            Type '"SharedArrayBuffer"' is not assignable to type '"ArrayBuffer"'.
src/index.ts(1,58): error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

```

## プラン

TypeScript 5.9 系の型定義変更により、素の `Uint8Array`（型引数なし）は `Uint8Array<ArrayBufferLike>` として扱われ、`BufferSource`（内部的に `ArrayBufferView<ArrayBuffer>` を要求）に代入できなくなっている。加えて `noUncheckedIndexedAccess` により `String.prototype.split` の分割代入結果が `string | undefined` になる点、`.ts` 拡張子付き相対 import が `allowImportingTsExtensions` 未設定のため許可されない点も原因。

1. `src/crypto.ts` の `Uint8Array` 関連の型注釈をすべて `Uint8Array<ArrayBuffer>` に明示する（`Uint8ArrayWithBase64`、`Uint8ArrayConstructorWithBase64.fromBase64` の戻り値、`OutputEncryptByApi.iv`、`PropsDecryptByApi.iv`）。
2. `decrypt()` 内で `encryptedText.split(":")` の分割代入結果が `undefined` の場合はエラーを投げるガード節を追加し、`string | undefined` を `string` に絞り込む。
3. ルートの `tsconfig.json` に `allowImportingTsExtensions: true` と `rewriteRelativeImportExtensions: true` を追加し、`.ts` 拡張子付きの相対 import（`src/index.ts` の `./crypto.ts`）を許可しつつビルド時に `.js` へ書き換えられるようにする（`tsconfig.test.json` はこれを継承）。
4. `npm run typecheck` と `npm run build` の両方でエラーが解消することを確認する。

## 完了サマリー

- 完了日時: 2026-09-26T03:36:17+09:00
- `src/crypto.ts` の `Uint8Array` 関連の型注釈を `Uint8Array<ArrayBuffer>` に明示し、`decrypt()` に `split(":")` の未定義チェックを追加した。
- ルートの `tsconfig.json` に `allowImportingTsExtensions` と `rewriteRelativeImportExtensions` を追加し、`.ts` 拡張子付き相対 import を許可した。
- `npm run typecheck`、`npm run build`（生成物は確認後に削除済み）ともにエラーなく完了することを確認した。
- 詳細は `kanban/0001_fix_typecheck_errors/log.md` を参照。
