import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from '../../src/utils/tokenEncryption';

describe('tokenEncryption', () => {
  describe('encryptToken()', () => {
    it('produces a string in iv:encrypted:authTag format', () => {
      const result = encryptToken('my-secret-token');
      const parts = result.split(':');
      expect(parts).toHaveLength(3);
      // Each part should be hex-encoded (non-empty)
      for (const part of parts) {
        expect(part.length).toBeGreaterThan(0);
        expect(part).toMatch(/^[0-9a-f]+$/);
      }
    });

    it('produces different ciphertext each time (random IV)', () => {
      const plaintext = 'same-token-value';
      const encrypted1 = encryptToken(plaintext);
      const encrypted2 = encryptToken(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('returns empty string for empty input', () => {
      expect(encryptToken('')).toBe('');
    });
  });

  describe('decryptToken()', () => {
    it('round-trips correctly', () => {
      const plaintext = 'my-secret-jwt-token-12345';
      const encrypted = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('handles unicode content', () => {
      const plaintext = 'token-with-unicode-\u00e9\u00e8\u00ea';
      const encrypted = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('returns plaintext if input is not encrypted format (backward compat)', () => {
      const plaintext = 'legacy-plain-token';
      // No colons, so it should be returned as-is
      expect(decryptToken(plaintext)).toBe(plaintext);
    });

    it('returns original string for two-part colon string (not 3-part)', () => {
      const twoPartString = 'part1:part2';
      expect(decryptToken(twoPartString)).toBe(twoPartString);
    });

    it('returns empty string for empty input', () => {
      expect(decryptToken('')).toBe('');
    });
  });
});
