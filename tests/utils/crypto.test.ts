import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signPayload, createSignablePayload } from '../../utils/crypto';

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    importKey: vi.fn(),
    sign: vi.fn(),
  },
};

// Mock global crypto
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

describe('crypto utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signPayload', () => {
    it('should sign payload with HMAC-SHA256', async () => {
      // Mock successful key import
      mockCrypto.subtle.importKey.mockResolvedValue('mock-key');

      // Mock successful signature
      const mockSignature = new ArrayBuffer(32);
      const mockSignatureArray = new Uint8Array(mockSignature);
      mockSignatureArray.set([0x01, 0x02, 0x03, 0x04]); // Sample bytes
      mockCrypto.subtle.sign.mockResolvedValue(mockSignature);

      const result = await signPayload('test-payload', 'secret-key');

      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.anything(),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      expect(mockCrypto.subtle.sign).toHaveBeenCalledWith(
        'HMAC',
        'mock-key',
        expect.anything()
      );

      const expectedHex = Array.from(mockSignatureArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      expect(result).toBe(expectedHex);
    });

    it('should handle empty payload', async () => {
      mockCrypto.subtle.importKey.mockResolvedValue('mock-key');
      mockCrypto.subtle.sign.mockResolvedValue(new ArrayBuffer(32));

      await expect(signPayload('', 'secret')).resolves.toBeDefined();
    });

    it('should handle empty secret', async () => {
      mockCrypto.subtle.importKey.mockResolvedValue('mock-key');
      mockCrypto.subtle.sign.mockResolvedValue(new ArrayBuffer(32));

      await expect(signPayload('payload', '')).resolves.toBeDefined();
    });
  });

  describe('createSignablePayload', () => {
    it('should create signable payload with critical fields', () => {
      const data = {
        sessionId: 'session-123',
        serverSessionId: 'server-456',
        player: {
          score: 1000,
          kills: 50,
          survivalTimeMs: 120000,
        },
        bitcoin: {
          pnlAtDeath: 15.5,
        },
        extraField: 'should be ignored',
      };

      const result = createSignablePayload(data);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        sessionId: 'session-123',
        serverSessionId: 'server-456',
        score: 1000,
        kills: 50,
        pnl: 15.5,
        duration: 120,
      });
    });

    it('should handle missing fields with defaults', () => {
      const data = {};

      const result = createSignablePayload(data);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        sessionId: undefined,
        serverSessionId: undefined,
        score: 0,
        kills: 0,
        pnl: 0,
        duration: 0,
      });
    });

    it('should handle partial data', () => {
      const data = {
        player: {
          score: 500,
        },
        bitcoin: {
          pnlAtDeath: -10.2,
        },
      };

      const result = createSignablePayload(data);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        sessionId: undefined,
        serverSessionId: undefined,
        score: 500,
        kills: 0,
        pnl: -10.2,
        duration: 0,
      });
    });

    it('should convert survival time to seconds', () => {
      const data = {
        player: {
          survivalTimeMs: 61500, // 61.5 seconds
        },
      };

      const result = createSignablePayload(data);
      const parsed = JSON.parse(result);

      expect(parsed.duration).toBe(61); // Floor to seconds
    });
  });
});
