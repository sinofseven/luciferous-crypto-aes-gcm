# @luciferous/crypto-aes-gcm

Web Crypto API 上に AES-GCM の鍵生成・暗号化・復号を薄くラップした ESM ライブラリです。ランタイム依存パッケージはゼロで、Cloudflare Workers と Node.js (>=26) で動作します。

## インストール

```sh
npm install @luciferous/crypto-aes-gcm
```

## 使い方

```ts
import { decrypt, encrypt, generateKey, importKey } from "@luciferous/crypto-aes-gcm";

// 1. AES-256 の鍵を base64 文字列として生成する
const base64Key = await generateKey();

// 2. base64 文字列から CryptoKey を復元する
//    （import した鍵は extractable: false で扱われるため再 export はできない）
const key = await importKey(base64Key);

// 3. 暗号化する（戻り値は base64(iv):base64(ciphertext) の形式）
const encrypted = await encrypt({ key, plaintext: "hello" });

// 4. 復号する
const decrypted = await decrypt({ encryptedText: encrypted, key });

console.log(decrypted); // "hello"
```

## API

### `generateKey(): Promise<string>`

AES-256 の鍵を新規生成し、base64 文字列として返します。

### `importKey(rawKey: string): Promise<CryptoKey>`

`generateKey()` が返した base64 文字列から `CryptoKey` を復元します。生成される鍵は常に `extractable: false` で、再エクスポートはできません。

### `encrypt(props: PropsEncrypt): Promise<string>`

```ts
type PropsEncrypt = {
  plaintext: string;
  key: CryptoKey;
};
```

12バイトのランダムな IV で `plaintext` を暗号化し、`` `${base64(iv)}:${base64(ciphertext)}` `` 形式の文字列を返します。

### `decrypt(props: PropsDecrypt): Promise<string>`

```ts
type PropsDecrypt = {
  encryptedText: string;
  key: CryptoKey;
};
```

`encrypt()` が返した文字列を復号して平文を返します。`encryptedText` を `:` で分割した際に IV または ciphertext のどちらかが欠けている場合、`Invalid encrypted text format` を throw します。

## 開発

| 目的                  | コマンド             |
| --------------------- | -------------------- |
| ビルド (`dist/` 生成) | `npm run build`      |
| 型検査                | `npm run typecheck`  |
| テスト                | `npm test`           |
| Lint                  | `npm run lint`       |
| フォーマット          | `npm run format`     |

詳細は `CLAUDE.md` を参照してください。

## ライセンス

MIT
