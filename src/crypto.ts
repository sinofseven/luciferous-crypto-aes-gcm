type Uint8ArrayBase64Options = {
  alphabet?: "base64" | "base64url";
  omitPadding?: boolean;
};

type Uint8ArrayFromBase64Options = Uint8ArrayBase64Options & {
  lastChunkHandling?: "loose" | "strict" | "stop-before-partial";
};

/**
 * TC39's Uint8Array base64 methods (`toBase64` / `fromBase64`) are not yet part of
 * the standard TypeScript lib types, so they are declared here manually. Once they
 * land in `lib`, this interface and its casts at the call sites can be removed.
 */
// oxlint-disable-next-line typescript/consistent-type-definitions
interface Uint8ArrayWithBase64 extends Uint8Array<ArrayBuffer> {
  toBase64: (options?: Uint8ArrayBase64Options) => string;
}

/** See {@link Uint8ArrayWithBase64} for why this is declared manually. */
// oxlint-disable-next-line typescript/consistent-type-definitions
interface Uint8ArrayConstructorWithBase64 extends Uint8ArrayConstructor {
  fromBase64: (base64: string, options?: Uint8ArrayFromBase64Options) => Uint8Array<ArrayBuffer>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const algorithmName = "AES-GCM";
const lengthKey = 256;
const lengthIv = 12;

type AllKeyUsages =
  | "encrypt"
  | "decrypt"
  | "sign"
  | "verify"
  | "deriveKey"
  | "deriveBits"
  | "wrapKey"
  | "unwrapKey";

type KeyConfig = {
  extractable?: boolean;
  keyUsages?: AllKeyUsages[];
};

/** Generates a raw AES-GCM {@link CryptoKey} via the Web Crypto API. `extractable` defaults to `true`. */
function generateKeyByApi(props?: KeyConfig): Promise<CryptoKey> {
  const extractable = props?.extractable ?? true;
  const keyUsage = props?.keyUsages ?? ["encrypt", "decrypt"];
  return crypto.subtle.generateKey(
    {
      length: lengthKey,
      name: algorithmName,
    },
    extractable,
    keyUsage,
  ) as Promise<CryptoKey>;
}

function exportKeyByApi(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("raw", key) as Promise<ArrayBuffer>;
}

/**
 * Imports a raw AES-GCM key via the Web Crypto API. `extractable` defaults to `true`;
 * {@link importKey} overrides this to `false` so imported keys cannot be re-exported.
 */
function importKeyByApi(raw: BufferSource, config?: KeyConfig): Promise<CryptoKey> {
  const extractable = config?.extractable ?? true;
  const keyUsage = config?.keyUsages ?? ["encrypt", "decrypt"];
  return crypto.subtle.importKey("raw", raw, { name: algorithmName }, extractable, keyUsage);
}

/** Parameters for {@link encrypt}. */
type PropsEncrypt = {
  /** Plaintext string to encrypt. */
  plaintext: string;
  /** AES-GCM key obtained from {@link importKey}. */
  key: CryptoKey;
};

type OutputEncryptByApi = {
  ciphertext: ArrayBuffer;
  iv: Uint8Array<ArrayBuffer>;
};

async function encryptByApi({ plaintext, key }: PropsEncrypt): Promise<OutputEncryptByApi> {
  const iv = crypto.getRandomValues(new Uint8Array(lengthIv));

  const ciphertext = await crypto.subtle.encrypt(
    { iv, name: algorithmName },
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
  const raw = await crypto.subtle.decrypt({ iv, name: algorithmName }, key, ciphertext);

  return decoder.decode(raw);
}

/**
 * Generates a new AES-256 key.
 *
 * @returns A base64-encoded string of the raw key. Pass it to {@link importKey}
 * to obtain a usable {@link CryptoKey}.
 */
async function generateKey(): Promise<string> {
  const key = await generateKeyByApi();
  const raw = await exportKeyByApi(key);
  return (new Uint8Array(raw) as Uint8ArrayWithBase64).toBase64();
}

/**
 * Restores a {@link CryptoKey} from a base64-encoded key produced by {@link generateKey}.
 *
 * The resulting key is always `extractable: false`, so it can never be re-exported.
 *
 * @param rawKey Base64-encoded raw key, as returned by {@link generateKey}.
 * @returns The restored AES-GCM key.
 */
async function importKey(rawKey: string): Promise<CryptoKey> {
  const raw = (Uint8Array as Uint8ArrayConstructorWithBase64).fromBase64(rawKey);
  return importKeyByApi(raw, { extractable: false });
}

/**
 * Encrypts `props.plaintext` with a randomly generated 12-byte IV.
 *
 * @param props Encryption parameters.
 * @param props.plaintext Plaintext string to encrypt.
 * @param props.key AES-GCM key obtained from {@link importKey}.
 * @returns The encrypted text in `` `${base64(iv)}:${base64(ciphertext)}` `` format.
 *
 * @example
 * ```ts
 * const encrypted = await encrypt({ key, plaintext: "hello" });
 * ```
 */
async function encrypt(props: PropsEncrypt): Promise<string> {
  const resp = await encryptByApi(props);
  const vector = (resp.iv as Uint8ArrayWithBase64).toBase64();
  const data = (new Uint8Array(resp.ciphertext) as Uint8ArrayWithBase64).toBase64();
  return `${vector}:${data}`;
}

/** Parameters for {@link decrypt}. */
type PropsDecrypt = {
  /** Encrypted text produced by {@link encrypt}. */
  encryptedText: string;
  /** AES-GCM key obtained from {@link importKey}. */
  key: CryptoKey;
};

/**
 * Decrypts text produced by {@link encrypt} back into its original plaintext.
 *
 * @param props Decryption parameters.
 * @param props.encryptedText Encrypted text in `` `${base64(iv)}:${base64(ciphertext)}` `` format.
 * @param props.key AES-GCM key obtained from {@link importKey}.
 * @returns The decrypted plaintext string.
 * @throws {Error} `Invalid encrypted text format` if `encryptedText` is missing the IV or ciphertext part.
 *
 * @example
 * ```ts
 * const decrypted = await decrypt({ encryptedText: encrypted, key });
 * ```
 */
async function decrypt({ encryptedText, key }: PropsDecrypt): Promise<string> {
  const [base64Iv, base64Ciphertext] = encryptedText.split(":");
  if (base64Iv === undefined || base64Ciphertext === undefined) {
    throw new Error("Invalid encrypted text format");
  }
  const iv = (Uint8Array as Uint8ArrayConstructorWithBase64).fromBase64(base64Iv);
  const ciphertext = (Uint8Array as Uint8ArrayConstructorWithBase64).fromBase64(base64Ciphertext);
  return decryptByApi({ ciphertext, iv, key });
}

export { generateKey, importKey, encrypt, decrypt };
export type { PropsEncrypt, PropsDecrypt };
