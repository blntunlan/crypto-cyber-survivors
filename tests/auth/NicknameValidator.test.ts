import { describe, it, expect } from 'vitest';
import { NicknameValidator } from '../../services/auth/NicknameValidator';

describe('NicknameValidator', () => {
  it('should validate valid nicknames', () => {
    expect(NicknameValidator.isValid('CryptoKing')).toBe(true);
    expect(NicknameValidator.isValid('user_123')).toBe(true);
    expect(NicknameValidator.isValid('abc')).toBe(true);
    expect(NicknameValidator.isValid('a'.repeat(16))).toBe(true);
  });

  it('should reject short nicknames', () => {
    expect(NicknameValidator.isValid('ab')).toBe(false);
    expect(NicknameValidator.validate('ab')).toContain('at least 3');
  });

  it('should reject long nicknames', () => {
    expect(NicknameValidator.isValid('a'.repeat(17))).toBe(false);
    expect(NicknameValidator.validate('a'.repeat(17))).toContain('at most 16');
  });

  it('should reject invalid characters', () => {
    expect(NicknameValidator.isValid('user!')).toBe(false);
    expect(NicknameValidator.isValid('user space')).toBe(false);
    expect(NicknameValidator.isValid('user-name')).toBe(true);
    expect(NicknameValidator.validate('user!')).toContain(
      'Only letters, numbers, underscores, and hyphens'
    );
  });

  it('should handle empty input', () => {
    expect(NicknameValidator.isValid('')).toBe(false);
    expect(NicknameValidator.validate('')).toBe('Nickname is required');
  });
});
