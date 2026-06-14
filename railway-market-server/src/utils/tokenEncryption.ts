import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Derives a 256-bit encryption key from Railway-native secrets.
 * Falls back to a fixed key for development when no secret is set.
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.TOKEN_ENCRYPTION_SECRET ??
    process.env.API_JWT_SECRET ??
    process.env.RAILWAY_JWT_SECRET ??
    process.env.JWT_SECRET;
  if (!secret) {
    // Dev fallback — deterministic but not secure
    return createHash('sha256').update('dev-token-encryption-key').digest();
  }
  return createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext token string.
 * Returns: `iv:encrypted:authTag` (hex-encoded, colon-separated)
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

/**
 * Decrypt an encrypted token string.
 * Expects format: `iv:encrypted:authTag` (hex-encoded, colon-separated)
 * Returns plaintext, or the original string if it doesn't look encrypted.
 */
export function decryptToken(encrypted: string): string {
  if (!encrypted) return encrypted;

  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    // Not encrypted (legacy plaintext) — return as-is
    return encrypted;
  }

  const [ivHex, encryptedHex, tagHex] = parts;

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // Decryption failed — return original (may be plaintext legacy data)
    return encrypted;
  }
}
