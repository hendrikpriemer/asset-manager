import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret, SecretEncryptionError } from "./secret-encryption";

const VALID_KEY = "a".repeat(64); // 32 bytes hex

beforeEach(() => {
  vi.stubEnv("SECRET_ENCRYPTION_KEY", VALID_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext secret", () => {
    const encrypted = encryptSecret("sk-ant-super-secret-key");

    expect(decryptSecret(encrypted)).toBe("sk-ant-super-secret-key");
  });

  it("produces a different ciphertext each time (random IV), even for the same plaintext", () => {
    const first = encryptSecret("same-secret");
    const second = encryptSecret("same-secret");

    expect(first).not.toBe(second);
    expect(decryptSecret(first)).toBe("same-secret");
    expect(decryptSecret(second)).toBe("same-secret");
  });

  it("throws when SECRET_ENCRYPTION_KEY is not set", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("SECRET_ENCRYPTION_KEY", "");

    expect(() => encryptSecret("x")).toThrow(SecretEncryptionError);
  });

  it("throws when SECRET_ENCRYPTION_KEY is not 32 bytes of hex", () => {
    vi.stubEnv("SECRET_ENCRYPTION_KEY", "tooshort");

    expect(() => encryptSecret("x")).toThrow(SecretEncryptionError);
  });

  it("throws when decrypting a malformed stored value", () => {
    expect(() => decryptSecret("not-the-right-shape")).toThrow(SecretEncryptionError);
  });

  it("throws when the ciphertext has been tampered with (auth tag mismatch)", () => {
    const encrypted = encryptSecret("sk-ant-super-secret-key");
    const [iv, authTag, ciphertext] = encrypted.split(".");
    const tamperedCiphertext = Buffer.from(ciphertext, "base64");
    tamperedCiphertext[0] ^= 0xff;
    const tampered = [iv, authTag, tamperedCiphertext.toString("base64")].join(".");

    expect(() => decryptSecret(tampered)).toThrow();
  });
});
