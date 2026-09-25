import { describe, expect, it } from "vitest";

describe("test runtime", () => {
  it("runs inside workerd, not Node", () => {
    expect.hasAssertions();
    // crypto.subtle だけでは Node でも通ってしまうため、
    // 実際に Workers ランタイムで動いていることをここで確かめる。
    expect(navigator.userAgent).toBe("Cloudflare-Workers");
  });

  it("exposes the Web Crypto API the library will build on", async () => {
    expect.hasAssertions();
    const key = await crypto.subtle.generateKey({ length: 256, name: "AES-GCM" }, true, [
      "encrypt",
      "decrypt",
    ]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode("hello");

    const ciphertext = await crypto.subtle.encrypt({ iv, name: "AES-GCM" }, key, plaintext);
    const roundTripped = await crypto.subtle.decrypt({ iv, name: "AES-GCM" }, key, ciphertext);

    expect(new TextDecoder().decode(roundTripped)).toBe("hello");
  });
});
