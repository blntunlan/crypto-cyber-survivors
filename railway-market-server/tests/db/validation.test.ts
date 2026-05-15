import { describe, it, expect } from 'vitest';
import {
  createProfileSchema,
  updateProfileSchema,
  startSessionSchema,
  syncSessionSchema,
  errorReportSchema,
  saveReplaySchema,
  purchaseUpgradeSchema,
} from '../../src/db/validation';

describe('validation schemas', () => {
  describe('createProfileSchema — nickname', () => {
    it('accepts valid nicknames (3-16 chars, alphanumeric + underscore + hyphen)', () => {
      const validNames = ['abc', 'Player_1', 'my-name', 'A1B2C3D4E5F6G7H8', 'a_b-c'];
      for (const nickname of validNames) {
        const result = createProfileSchema.safeParse({ nickname });
        expect(result.success, `Expected "${nickname}" to be valid`).toBe(true);
      }
    });

    it('rejects nicknames that are too short (< 3 chars)', () => {
      const result = createProfileSchema.safeParse({ nickname: 'ab' });
      expect(result.success).toBe(false);
    });

    it('rejects nicknames that are too long (> 16 chars)', () => {
      const result = createProfileSchema.safeParse({ nickname: 'a'.repeat(17) });
      expect(result.success).toBe(false);
    });

    it('rejects nicknames with special characters', () => {
      const invalidNames = ['hello!', 'user@name', 'no spaces', 'foo.bar', 'tab\there'];
      for (const nickname of invalidNames) {
        const result = createProfileSchema.safeParse({ nickname });
        expect(result.success, `Expected "${nickname}" to be invalid`).toBe(false);
      }
    });

    it('rejects empty nickname', () => {
      const result = createProfileSchema.safeParse({ nickname: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('createProfileSchema — avatar_url', () => {
    it('accepts valid URL', () => {
      const result = createProfileSchema.safeParse({
        nickname: 'Player1',
        avatar_url: 'https://example.com/avatar.png',
      });
      expect(result.success).toBe(true);
    });

    it('accepts null/undefined avatar_url', () => {
      const result = createProfileSchema.safeParse({ nickname: 'Player1' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid URL', () => {
      const result = createProfileSchema.safeParse({
        nickname: 'Player1',
        avatar_url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('accepts partial updates (nickname only)', () => {
      const result = updateProfileSchema.safeParse({ nickname: 'NewName' });
      expect(result.success).toBe(true);
    });

    it('accepts empty object (all fields optional)', () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('startSessionSchema', () => {
    it('accepts valid session data', () => {
      const result = startSessionSchema.safeParse({
        pair: 'BTCUSD',
        leverage: 10,
        position: 'LONG',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid position', () => {
      const result = startSessionSchema.safeParse({
        pair: 'BTCUSD',
        leverage: 10,
        position: 'NEUTRAL',
      });
      expect(result.success).toBe(false);
    });

    it('rejects leverage > 500', () => {
      const result = startSessionSchema.safeParse({
        pair: 'BTCUSD',
        leverage: 501,
        position: 'LONG',
      });
      expect(result.success).toBe(false);
    });

    it('rejects leverage < 1', () => {
      const result = startSessionSchema.safeParse({
        pair: 'BTCUSD',
        leverage: 0,
        position: 'LONG',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('syncSessionSchema', () => {
    const sessionId = '11111111-1111-4111-8111-111111111111';

    it('accepts valid runtime metric sync data', () => {
      const result = syncSessionSchema.safeParse({
        sessionId,
        sessionData: {
          entry_price: 50000,
          exit_price: 51000,
          survival_seconds: 180,
          kills: 42,
          level: 6,
          exit_type: 'portal',
          portal_type: 'TAKE_PROFIT',
        },
      });

      expect(result.success).toBe(true);
    });

    it('rejects server-owned fields', () => {
      const result = syncSessionSchema.safeParse({
        sessionId,
        sessionData: {
          reward_amount: 50000,
        },
      });

      expect(result.success).toBe(false);
    });

    it('rejects negative runtime metrics', () => {
      const result = syncSessionSchema.safeParse({
        sessionId,
        sessionData: {
          survival_seconds: -1,
        },
      });

      expect(result.success).toBe(false);
    });

    it('rejects portal type without a portal exit', () => {
      const result = syncSessionSchema.safeParse({
        sessionId,
        sessionData: {
          exit_type: 'death',
          portal_type: 'TAKE_PROFIT',
        },
      });

      expect(result.success).toBe(false);
    });

    it('rejects portal exits without portal type', () => {
      const result = syncSessionSchema.safeParse({
        sessionId,
        sessionData: {
          exit_type: 'portal',
        },
      });

      expect(result.success).toBe(false);
    });

    it('rejects non-uuid session ids', () => {
      const result = syncSessionSchema.safeParse({
        sessionId: 'local-123',
        sessionData: {
          survival_seconds: 30,
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('errorReportSchema', () => {
    it('accepts valid error report', () => {
      const result = errorReportSchema.safeParse({
        error_type: 'runtime',
        message: 'Something went wrong',
      });
      expect(result.success).toBe(true);
    });

    it('defaults severity to medium', () => {
      const result = errorReportSchema.safeParse({
        error_type: 'runtime',
        message: 'err',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.severity).toBe('medium');
      }
    });

    it('rejects message exceeding 2000 chars', () => {
      const result = errorReportSchema.safeParse({
        error_type: 'runtime',
        message: 'x'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('saveReplaySchema', () => {
    it('accepts valid replay', () => {
      const result = saveReplaySchema.safeParse({
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        score: 1000,
        duration_ms: 60000,
        final_level: 5,
        total_kills: 42,
        pair: 'BTCUSD',
        position: 'SHORT',
        leverage: 50,
        replay_data: 'base64encodeddata',
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-uuid session_id', () => {
      const result = saveReplaySchema.safeParse({
        session_id: 'not-a-uuid',
        score: 1000,
        duration_ms: 60000,
        final_level: 5,
        total_kills: 42,
        pair: 'BTCUSD',
        position: 'SHORT',
        leverage: 50,
        replay_data: 'data',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('purchaseUpgradeSchema', () => {
    it('accepts valid upgrade purchase', () => {
      const result = purchaseUpgradeSchema.safeParse({
        upgrade_id: 'health_boost',
        cost: 100,
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative cost', () => {
      const result = purchaseUpgradeSchema.safeParse({
        upgrade_id: 'health_boost',
        cost: -1,
      });
      expect(result.success).toBe(false);
    });
  });
});
