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
