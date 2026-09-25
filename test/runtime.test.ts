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
