import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db/pool module before importing auditLogger
vi.mock('../../src/db/pool.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

vi.mock('../../src/utils/logger.js', () => ({
  Logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { logAudit, getClientInfo } from '../../src/utils/auditLogger';
import { query } from '../../src/db/pool.js';

const mockedQuery = vi.mocked(query);

describe('auditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getClientInfo()', () => {
    it('extracts IP from x-forwarded-for header', () => {
      const req = {
        headers: {
          'x-forwarded-for': '1.2.3.4, 5.6.7.8',
          'user-agent': 'TestAgent/1.0',
        },
        ip: '127.0.0.1',
      };
      const info = getClientInfo(req);
      expect(info.ipAddress).toBe('1.2.3.4');
    });

    it('falls back to req.ip when x-forwarded-for is missing', () => {
      const req = {
        headers: { 'user-agent': 'TestAgent/1.0' },
        ip: '10.0.0.1',
      };
      const info = getClientInfo(req);
      expect(info.ipAddress).toBe('10.0.0.1');
    });

    it('returns "unknown" when no IP info is available', () => {
      const req = {
        headers: {},
      };
      const info = getClientInfo(req);
      expect(info.ipAddress).toBe('unknown');
    });

    it('extracts user-agent from headers', () => {
      const req = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        ip: '127.0.0.1',
      };
      const info = getClientInfo(req);
      expect(info.userAgent).toBe('Mozilla/5.0');
    });

    it('returns "unknown" user-agent when header is missing', () => {
      const req = {
        headers: {},
      };
      const info = getClientInfo(req);
      expect(info.userAgent).toBe('unknown');
    });
  });

  describe('logAudit()', () => {
    it('calls query with correct INSERT params', async () => {
      await logAudit({
        profileId: 'profile-123',
        action: 'auth.login',
        resource: '/api/v1/auth/login',
        details: { method: 'email' },
        ipAddress: '1.2.3.4',
        userAgent: 'TestAgent',
      });

      expect(mockedQuery).toHaveBeenCalledOnce();
      const [sql, params] = mockedQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO audit_log');
      expect(params).toEqual([
        'profile-123',
        'auth.login',
        '/api/v1/auth/login',
        JSON.stringify({ method: 'email' }),
        '1.2.3.4',
        'TestAgent',
      ]);
    });

    it('uses null for optional fields when not provided', async () => {
      await logAudit({
        action: 'session.start',
        resource: '/api/v1/sessions',
      });

      expect(mockedQuery).toHaveBeenCalledOnce();
      const [, params] = mockedQuery.mock.calls[0];
      expect(params![0]).toBeNull(); // profileId
      expect(params![3]).toBe('{}'); // details
      expect(params![4]).toBeNull(); // ipAddress
      expect(params![5]).toBeNull(); // userAgent
    });

    it('does not throw when query fails', async () => {
      mockedQuery.mockRejectedValueOnce(new Error('DB connection failed'));

      // Should not throw
      await expect(
        logAudit({
          action: 'auth.login',
          resource: '/api/v1/auth/login',
        })
      ).resolves.toBeUndefined();
    });
  });
});
