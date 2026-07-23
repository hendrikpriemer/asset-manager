/**
 * Encrypts/decrypts a secret (currently just the vision-provider API key,
 * `lib/vision-provider-settings.ts`) before it's stored in Postgres - the
 * first secret this app has ever stored, so unlike the rest of its
 * configuration (plain `AasRepository` base URLs, `.env` vars) this
 * deliberately isn't kept in plaintext: a leaked database backup shouldn't
 * hand over a live, billable third-party API key.
 *
 * AES-256-GCM via Node's built-in `crypto` module - no new dependency.
 * Stored format is `{iv}.{authTag}.{ciphertext}`, each base64-encoded.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

export class SecretEncryptionError extends Error {}

function getEncryptionKey(): Buffer {
  const key = process.env.SECRET_ENCRYPTION_KEY;
  if (!key) {
    throw new SecretEncryptionError("SECRET_ENCRYPTION_KEY is not set.");
  }
  const buffer = Buffer.from(key, "hex");
  if (buffer.length !== 32) {
    throw new SecretEncryptionError(
      "SECRET_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate one with: openssl rand -hex 32"
    );
  }
  return buffer;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((part) => part.toString("base64")).join(".");
}

export function decryptSecret(stored: string): string {
  const parts = stored.split(".");
  if (parts.length !== 3) {
    throw new SecretEncryptionError("Malformed encrypted secret.");
  }
  const [ivPart, authTagPart, encryptedPart] = parts;
  const iv = Buffer.from(ivPart, "base64");
  const authTag = Buffer.from(authTagPart, "base64");
  const encrypted = Buffer.from(encryptedPart, "base64");

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
