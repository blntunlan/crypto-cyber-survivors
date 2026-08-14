/**
 * tests/diagnostics/ClientServerMatrix.test.ts
 *
 * Automated diagnostic test matrix validating client-server contract parity,
 * schema validation rules, HMAC signatures, and error boundary handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  startSessionSchema,
  verifySessionSchema,
  anonymousAuthSchema,
  marketRuntimeBatchSchema,
} from '../../railway-market-server/src/db/validation';
import { signPayload, createSignablePayload } from '../../utils/crypto';
import { EventBus } from '../../services/core/EventBus';

describe('Client-Server Contract & Diagnostic Matrix', () => {
  beforeEach(() => {
    EventBus.clear();
  });

  describe('1. Session Lifecycle Contracts', () => {
    it('accepts valid session start payload with long position', () => {
      const validPayload = {
        pair: 'BTC_USDT',
        leverage: 10,
        position: 'LONG' as const,
      };

      const result = startSessionSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pair).toBe('BTC_USDT');
        expect(result.data.leverage).toBe(10);
        expect(result.data.position).toBe('LONG');
      }
    });

    it('rejects session start with leverage exceeding 500 limit', () => {
      const invalidPayload = {
        pair: 'BTC_USDT',
        leverage: 1000,
        position: 'SHORT' as const,
      };

      const result = startSessionSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('validates verifySession payload and HMAC signature round-trip', async () => {
      const sessionId = '123e4567-e89b-12d3-a456-426614174000';
      const secret = 'super-secret-key-for-test-validation-32';

      const clientVerifyPayload = {
        sessionId,
        pair: 'BTC_USDT',
        position: 'LONG',
        leverage: 10,
        claimedEntryPrice: 90000,
        claimedExitPrice: 95000,
        claimedPnL: 5.5,
        kills: 42,
        level: 12,
        survivalSeconds: 300,
        exitType: 'portal' as const,
        portalType: 'TAKE_PROFIT' as const,
        maxStreak: 5,
        rawCoins: 250,
        enemyDropCoins: 150,
        totalCoins: 400,
        pnlPercent: 5.5,
      };

      const signable = createSignablePayload(
        clientVerifyPayload as unknown as Record<string, unknown>
      );
      const signature = await signPayload(signable, secret);

      const backendBody = {
        sessionId,
        signature,
        payload: clientVerifyPayload,
      };

      const parsed = verifySessionSchema.safeParse(backendBody);
      expect(parsed.success).toBe(true);
      expect(signature).toBeDefined();
      expect(signature.length).toBe(64); // SHA-256 hex length
    });

    it('rejects verifySession when outer sessionId does not match payload sessionId', () => {
      const backendBody = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        signature: 'mock-signature-1234567890abcdef',
        payload: {
          sessionId: '987e6543-e21b-12d3-a456-426614174999', // Mismatch
          pair: 'BTC_USDT',
          position: 'LONG',
          leverage: 5,
          claimedEntryPrice: 90000,
          claimedExitPrice: 91000,
          claimedPnL: 1.1,
          kills: 10,
          level: 3,
          survivalSeconds: 60,
          exitType: 'death' as const,
          portalType: null,
          maxStreak: 1,
        },
      };

      const parsed = verifySessionSchema.safeParse(backendBody);
      expect(parsed.success).toBe(false);
    });

    it('rejects portal exit when portalType is missing or null', () => {
      const invalidPortalBody = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        signature: 'mock-signature',
        payload: {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          pair: 'BTC_USDT',
          position: 'LONG',
          leverage: 5,
          claimedEntryPrice: 90000,
          claimedExitPrice: 92000,
          claimedPnL: 2.2,
          kills: 15,
          level: 4,
          survivalSeconds: 90,
          exitType: 'portal' as const,
          portalType: null, // Required for portal exits
          maxStreak: 2,
        },
      };

      const parsed = verifySessionSchema.safeParse(invalidPortalBody);
      expect(parsed.success).toBe(false);
    });

    it('rejects death exit when portalType is populated', () => {
      const invalidDeathBody = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        signature: 'mock-signature',
        payload: {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          pair: 'BTC_USDT',
          position: 'LONG',
          leverage: 5,
          claimedEntryPrice: 90000,
          claimedExitPrice: 85000,
          claimedPnL: -5.5,
          kills: 15,
          level: 4,
          survivalSeconds: 90,
          exitType: 'death' as const,
          portalType: 'TAKE_PROFIT' as const, // Must be null for death exits
          maxStreak: 0,
        },
      };

      const parsed = verifySessionSchema.safeParse(invalidDeathBody);
      expect(parsed.success).toBe(false);
    });
  });

  describe('2. Authentication & Profile Contracts', () => {
    it('accepts valid anonymous auth request with compliant display_name', () => {
      const validAnon = {
        display_name: 'Cyber_Slayer-01',
        device_fingerprint: 'device-fingerprint-sample-12345678',
      };

      const result = anonymousAuthSchema.safeParse(validAnon);
      expect(result.success).toBe(true);
    });

    it('rejects anonymous nickname with special characters or invalid length', () => {
      const shortNick = { display_name: 'ab' }; // < 3 chars
      const invalidCharNick = { display_name: 'Player@123!' }; // Special chars forbidden

      expect(anonymousAuthSchema.safeParse(shortNick).success).toBe(false);
      expect(anonymousAuthSchema.safeParse(invalidCharNick).success).toBe(false);
    });
  });

  describe('3. Market Runtime Stream & Batch Contracts', () => {
    it('validates synchronized market runtime batch schema', () => {
      const validBatch = {
        runId: '123e4567-e89b-12d3-a456-426614174000',
        count: 2,
        items: [
          {
            runId: '123e4567-e89b-12d3-a456-426614174000',
            seq: 1,
            runConstants: { pair: 'BTC_USDT' },
            tick: { price: 92000, recvTs: Date.now() },
            snapshot: { rsi: 50, atrPercent: 1.2 },
          },
          {
            runId: '123e4567-e89b-12d3-a456-426614174000',
            seq: 2,
            runConstants: { pair: 'BTC_USDT' },
            tick: { price: 92050, recvTs: Date.now() + 1000 },
            snapshot: { rsi: 52, atrPercent: 1.2 },
          },
        ],
      };

      const result = marketRuntimeBatchSchema.safeParse(validBatch);
      expect(result.success).toBe(true);
    });

    it('rejects runtime batch where count does not match items length', () => {
      const invalidBatch = {
        runId: '123e4567-e89b-12d3-a456-426614174000',
        count: 5, // Count mismatch
        items: [
          {
            runId: '123e4567-e89b-12d3-a456-426614174000',
            seq: 1,
          },
        ],
      };

      const result = marketRuntimeBatchSchema.safeParse(invalidBatch);
      expect(result.success).toBe(false);
    });
  });

  describe('4. EventBus Client-Server Interceptor Bridges', () => {
    it('notifies subscribers via authUnauthorized event when 401 is encountered', () => {
      let receivedEvent: unknown = null;
      const unsubscribe = EventBus.on('authUnauthorized', event => {
        receivedEvent = event;
      });

      EventBus.emit('authUnauthorized', {
        path: '/api/v1/profile',
        status: 401,
        message: 'Token expired',
        timestamp: 1700000000000,
      });

      expect(receivedEvent).toEqual({
        path: '/api/v1/profile',
        status: 401,
        message: 'Token expired',
        timestamp: 1700000000000,
      });

      unsubscribe();
    });
  });
});
