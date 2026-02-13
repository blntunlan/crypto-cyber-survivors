import { describe, it, expect } from 'vitest';
import {
  simpleHash,
  createFingerprint,
  sanitizeMessage,
  sanitizeUrl,
  sanitizeContext,
  getDeviceFingerprint,
} from '../../../services/analytics/ErrorSanitizer';

describe('ErrorSanitizer', () => {
  describe('simpleHash', () => {
    it('should generate consistent hashes for same input', () => {
      const input = 'test-string';
      const hash1 = simpleHash(input);
      const hash2 = simpleHash(input);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = simpleHash('string-a');
      const hash2 = simpleHash('string-b');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createFingerprint', () => {
    it('should create hash from type and message', () => {
      const f1 = createFingerprint('TypeA', 'MessageA');
      const f2 = createFingerprint('TypeA', 'MessageA');
      const f3 = createFingerprint('TypeB', 'MessageA');

      expect(f1).toBe(f2);
      expect(f1).not.toBe(f3);
    });

    it('should include stack trace in fingerprint if available', () => {
      const stack1 = 'Error\n    at func1 (file1.ts:10:5)';
      const stack2 = 'Error\n    at func2 (file2.ts:20:5)';

      const f1 = createFingerprint('Error', 'msg', stack1);
      const f2 = createFingerprint('Error', 'msg', stack2);

      expect(f1).not.toBe(f2);
    });
  });

  describe('sanitizeMessage', () => {
    it('should redact API keys', () => {
      const msg = 'Failed with api_key: ABC-123-SECRET-KEY-LONG-ENOUGH';
      expect(sanitizeMessage(msg)).toContain('api_key=***');
      expect(sanitizeMessage(msg)).not.toContain('SECRET-KEY');
    });

    it('should redact tokens', () => {
      const msg = 'Authorization: Bearer my-secret-jwt-token-that-is-long';
      expect(sanitizeMessage(msg)).toContain('bearer ***');
      expect(sanitizeMessage(msg)).not.toContain('jwt-token');
    });

    it('should redact passwords', () => {
      const msg = 'Login failed for password: mypassword123';
      expect(sanitizeMessage(msg)).toContain('password=***');
    });

    it('should redact emails', () => {
      const msg = 'User test@example.com not found';
      expect(sanitizeMessage(msg)).toContain('[email_redacted]');
      expect(sanitizeMessage(msg)).not.toContain('test@example.com');
    });
  });

  describe('sanitizeUrl', () => {
    it('should redact sensitive query parameters', () => {
      const url = 'https://api.com/v1?token=secret&user=bob';
      const sanitized = sanitizeUrl(url);
      expect(sanitized).toContain('token=***');
      expect(sanitized).toContain('user=bob');
    });

    it('should return original string if URL is invalid', () => {
      const invalid = 'not-a-url';
      expect(sanitizeUrl(invalid)).toBe(invalid);
    });
  });

  describe('sanitizeContext', () => {
    it('should truncate long strings in context', () => {
      const longString = 'a'.repeat(300);
      const context = { key: longString };
      const sanitized = sanitizeContext(context);
      expect((sanitized?.key as string).length).toBeLessThan(300);
      expect(sanitized?.key as string).toContain('...');
    });

    it('should handle circular references', () => {
      const obj: any = { a: 1 };
      obj.self = obj;

      const sanitized = sanitizeContext(obj);
      expect(sanitized?.self).toBe('[Circular]');
    });

    it('should deep sanitize nested objects', () => {
      const context = {
        outer: {
          inner: 'a'.repeat(300),
        },
      };
      const sanitized = sanitizeContext(context);
      expect((sanitized?.outer as any).inner as string).toContain('...');
    });
  });

  describe('getDeviceFingerprint', () => {
    it('should return a non-empty string', () => {
      const fp = getDeviceFingerprint();
      expect(fp).toBeTruthy();
      expect(typeof fp).toBe('string');
    });
  });
});
