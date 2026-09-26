import { decrypt, encrypt, generateKey, importKey } from "../src/index.ts";
import { describe, expect, it } from "vitest";

function createImportedKey(): Promise<CryptoKey> {
  return generateKey().then((base64Key) => importKey(base64Key));
}

describe("generateKey()", () => {
  it("returns a non-empty base64 string", async () => {
    expect.hasAssertions();
    const key = await generateKey();
    expect(key).toBeTypeOf("string");
    expect(key.length).toBeGreaterThan(0);
  });

  it("decodes to 32 bytes for AES-256", async () => {
    expect.hasAssertions();
    const key = await generateKey();
    expect(atob(key)).toHaveLength(32);
  });

  it("returns a different key on each call", async () => {
    expect.hasAssertions();
    const [key1, key2] = await Promise.all([generateKey(), generateKey()]);
    expect(key1).not.toBe(key2);
  });
});

describe("importKey()", () => {
  it("returns a CryptoKey configured for AES-GCM", async () => {
    expect.hasAssertions();
    const key = await createImportedKey();
    expect(key.algorithm.name).toBe("AES-GCM");
  });

  it("returns a secret key usable for encrypt and decrypt", async () => {
    expect.hasAssertions();
    const key = await createImportedKey();
    expect(key.type).toBe("secret");
    expect(key.usages).toStrictEqual(expect.arrayContaining(["encrypt", "decrypt"]));
  });

  it("forces extractable to false", async () => {
    expect.hasAssertions();
    const key = await createImportedKey();
    expect(key.extractable ? "extractable" : "not extractable").toBe("not extractable");
  });

  it("rejects exportKey since the key is not extractable", async () => {
    expect.hasAssertions();
    const key = await createImportedKey();
    await expect(crypto.subtle.exportKey("raw", key)).rejects.toThrow(/.+/);
  });
});

describe("encrypt()", () => {
  it("returns base64(iv):base64(ciphertext)", async () => {
    expect.hasAssertions();
    const key = await createImportedKey();
    const encrypted = await encrypt({ key, plaintext: "hello" });
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(2);
    const [ivPart, ciphertextPart] = parts;
    if (ivPart === undefined || ciphertextPart === undefined) {
      throw new Error("unreachable: parts.length was already asserted to be 2");
    }
    expect(atob(ivPart)).toHaveLength(12);
    expect(atob(ciphertextPart).length).toBeGreaterThan(0);
  });

  it("produces a different ciphertext on each call due to a random iv", async () => {
    expect.hasAssertions();
    const key = await createImportedKey();
    const [encrypted1, encrypted2] = await Promise.all([
      encrypt({ key, plaintext: "hello" }),
      encrypt({ key, plaintext: "hello" }),
    ]);
    expect(encrypted1).not.toBe(encrypted2);
  });
});

describe("decrypt()", () => {
  it("throws when the encrypted text has no colon", async () => {
    expect.hasAssertions();
    const key = await createImportedKey();
    await expect(decrypt({ encryptedText: "nocolonhere", key })).rejects.toThrow(
      "Invalid encrypted text format",
    );
  });

  it("throws when the encrypted text is an empty string", async () => {
    expect.hasAssertions();
    const key = await createImportedKey();
    await expect(decrypt({ encryptedText: "", key })).rejects.toThrow(
      "Invalid encrypted text format",
    );
  });

  it("does not throw the format error when there are multiple colons", async () => {
    expect.hasAssertions();
    const key = await createImportedKey();
    const promise = decrypt({ encryptedText: "a:b:c", key });
    await expect(promise).rejects.toThrow(/.+/);
    await expect(promise).rejects.not.toThrow("Invalid encrypted text format");
  });

  it("rejects when decrypting with the wrong key", async () => {
    expect.hasAssertions();
    const [key1, key2] = await Promise.all([createImportedKey(), createImportedKey()]);
    const encrypted = await encrypt({ key: key1, plaintext: "hello" });
    await expect(decrypt({ encryptedText: encrypted, key: key2 })).rejects.toThrow(/.+/);
  });

  it("rejects when the ciphertext has been tampered with", async () => {
    expect.hasAssertions();
    const key = await createImportedKey();
    const encrypted = await encrypt({ key, plaintext: "hello" });
    const [ivPart, ciphertextPart] = encrypted.split(":");
    if (ivPart === undefined || ciphertextPart === undefined) {
      throw new Error("unreachable: encrypt() always returns iv:ciphertext");
    }
    const tamperedChar = ciphertextPart.startsWith("A") ? "B" : "A";
    const tampered = `${ivPart}:${tamperedChar}${ciphertextPart.slice(1)}`;
    await expect(decrypt({ encryptedText: tampered, key })).rejects.toThrow(/.+/);
  });
});

describe("round trip", () => {
  it("round trips through generateKey -> importKey -> encrypt -> decrypt", async () => {
    expect.hasAssertions();
    const base64Key = await generateKey();
    const key = await importKey(base64Key);
    const encrypted = await encrypt({ key, plaintext: "hello" });
    const decrypted = await decrypt({ encryptedText: encrypted, key });
    expect(decrypted).toBe("hello");
  });

  it("round trips an empty plaintext", async () => {
    expect.hasAssertions();
    const key = await createImportedKey();
    const encrypted = await encrypt({ key, plaintext: "" });
    const decrypted = await decrypt({ encryptedText: encrypted, key });
    expect(decrypted).toBe("");
  });

  it("round trips a multibyte plaintext", async () => {
    expect.hasAssertions();
    const key = await createImportedKey();
    const plaintext = "こんにちは、世界🎉";
    const encrypted = await encrypt({ key, plaintext });
    const decrypted = await decrypt({ encryptedText: encrypted, key });
    expect(decrypted).toBe(plaintext);
  });

  it("round trips a long plaintext", async () => {
    expect.hasAssertions();
    const key = await createImportedKey();
    const plaintext = "abcdefghij".repeat(500);
    const encrypted = await encrypt({ key, plaintext });
    const decrypted = await decrypt({ encryptedText: encrypted, key });
    expect(decrypted).toBe(plaintext);
  });
});
