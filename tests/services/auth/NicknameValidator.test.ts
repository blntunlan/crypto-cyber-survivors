import { describe, it, expect } from 'vitest';
import { NicknameValidator } from '../../../services/auth/NicknameValidator';

/**
 * NicknameValidator Unit Tests
 *
 * Tests cover:
 * - Happy path: valid nicknames
 * - Boundary values: min (3) and max (16) length limits
 * - Invalid characters: special chars, spaces, unicode
 * - Edge cases: empty, null-like, whitespace-only
 *
 * Following AAA pattern (Arrange-Act-Assert)
 */
describe('NicknameValidator', () => {
  // =====================
  // SECTION: validate()
  // =====================
  describe('validate()', () => {
    // -----------------------
    // Happy Path Tests
    // -----------------------
    describe('happy path - valid nicknames', () => {
      it('should return null for valid alphanumeric nickname', () => {
        // Arrange
        const nickname = 'Player123';

        // Act
        const result = NicknameValidator.validate(nickname);

        // Assert
        expect(result).toBeNull();
      });

      it('should return null for nickname with underscores', () => {
        const result = NicknameValidator.validate('cool_player_99');
        expect(result).toBeNull();
      });

      it('should return null for all lowercase nickname', () => {
        const result = NicknameValidator.validate('cryptoking');
        expect(result).toBeNull();
      });

      it('should return null for all uppercase nickname', () => {
        const result = NicknameValidator.validate('CRYPTOKING');
        expect(result).toBeNull();
      });

      it('should return null for all numeric nickname', () => {
        const result = NicknameValidator.validate('123456');
        expect(result).toBeNull();
      });

      it('should return null for mixed case with numbers', () => {
        const result = NicknameValidator.validate('CrypTo2024');
        expect(result).toBeNull();
      });

      it('should return null for underscore-only nickname (3+ chars)', () => {
        const result = NicknameValidator.validate('___');
        expect(result).toBeNull();
      });
    });

    // -----------------------
    // Boundary Value Tests
    // -----------------------
    describe('boundary values - length limits', () => {
      // Minimum length boundary (3 characters)
      it('should return null for exactly 3 characters (minimum)', () => {
        const result = NicknameValidator.validate('abc');
        expect(result).toBeNull();
      });

      it('should return error for 2 characters (below minimum)', () => {
        const result = NicknameValidator.validate('ab');
        expect(result).toBe('Nickname must be at least 3 characters');
      });

      it('should return null for 4 characters (above minimum)', () => {
        const result = NicknameValidator.validate('abcd');
        expect(result).toBeNull();
      });

      // Maximum length boundary (16 characters)
      it('should return null for exactly 16 characters (maximum)', () => {
        const result = NicknameValidator.validate('abcdefghij123456');
        expect(result).toBeNull();
      });

      it('should return error for 17 characters (above maximum)', () => {
        const result = NicknameValidator.validate('abcdefghij1234567');
        expect(result).toBe('Nickname must be at most 16 characters');
      });

      it('should return null for 15 characters (below maximum)', () => {
        const result = NicknameValidator.validate('abcdefghij12345');
        expect(result).toBeNull();
      });
    });

    // -----------------------
    // Empty & Required Tests
    // -----------------------
    describe('empty and required validation', () => {
      it('should return error for empty string', () => {
        const result = NicknameValidator.validate('');
        expect(result).toBe('Nickname is required');
      });

      it('should return error for whitespace-only string', () => {
        const result = NicknameValidator.validate('   ');
        expect(result).toBe('Nickname must be at least 3 characters');
      });

      it('should trim whitespace before validation', () => {
        // "  abc  " trims to "abc" which is 3 chars - valid
        const result = NicknameValidator.validate('  abc  ');
        expect(result).toBeNull();
      });

      it('should handle leading whitespace correctly', () => {
        const result = NicknameValidator.validate('   Player');
        expect(result).toBeNull();
      });

      it('should handle trailing whitespace correctly', () => {
        const result = NicknameValidator.validate('Player   ');
        expect(result).toBeNull();
      });
    });

    // -----------------------
    // Invalid Character Tests
    // -----------------------
    describe('invalid characters', () => {
      it('should return error for nickname with spaces', () => {
        const result = NicknameValidator.validate('Hello World');
        expect(result).toBe(
          'Only letters, numbers, underscores, and hyphens are allowed'
        );
      });

      it('should allow nickname with hyphen', () => {
        const result = NicknameValidator.validate('player-one');
        expect(result).toBeNull();
      });

      it('should return error for nickname with period', () => {
        const result = NicknameValidator.validate('player.one');
        expect(result).toBe(
          'Only letters, numbers, underscores, and hyphens are allowed'
        );
      });

      it('should return error for nickname with @ symbol', () => {
        const result = NicknameValidator.validate('player@crypto');
        expect(result).toBe(
          'Only letters, numbers, underscores, and hyphens are allowed'
        );
      });

      it('should return error for nickname with hash symbol', () => {
        const result = NicknameValidator.validate('player#123');
        expect(result).toBe(
          'Only letters, numbers, underscores, and hyphens are allowed'
        );
      });

      it('should return error for nickname with exclamation mark', () => {
        const result = NicknameValidator.validate('player!');
        expect(result).toBe(
          'Only letters, numbers, underscores, and hyphens are allowed'
        );
      });

      it('should return error for nickname with emoji', () => {
        const result = NicknameValidator.validate('player🚀');
        expect(result).toBe(
          'Only letters, numbers, underscores, and hyphens are allowed'
        );
      });

      it('should return error for nickname with unicode characters', () => {
        const result = NicknameValidator.validate('плейер');
        expect(result).toBe(
          'Only letters, numbers, underscores, and hyphens are allowed'
        );
      });

      it('should return error for nickname with Chinese characters', () => {
        const result = NicknameValidator.validate('玩家123');
        expect(result).toBe(
          'Only letters, numbers, underscores, and hyphens are allowed'
        );
      });

      it('should return error for nickname with special symbols', () => {
        const result = NicknameValidator.validate('$player$');
        expect(result).toBe(
          'Only letters, numbers, underscores, and hyphens are allowed'
        );
      });

      it('should return error for nickname with parentheses', () => {
        const result = NicknameValidator.validate('player(1)');
        expect(result).toBe(
          'Only letters, numbers, underscores, and hyphens are allowed'
        );
      });

      it('should return error for nickname with plus sign', () => {
        const result = NicknameValidator.validate('player+one');
        expect(result).toBe(
          'Only letters, numbers, underscores, and hyphens are allowed'
        );
      });
    });

    // -----------------------
    // Edge Cases
    // -----------------------
    describe('edge cases', () => {
      it('should handle single underscore at start', () => {
        const result = NicknameValidator.validate('_player');
        expect(result).toBeNull();
      });

      it('should handle single underscore at end', () => {
        const result = NicknameValidator.validate('player_');
        expect(result).toBeNull();
      });

      it('should handle multiple consecutive underscores', () => {
        const result = NicknameValidator.validate('player__name');
        expect(result).toBeNull();
      });

      it('should handle nickname starting with number', () => {
        const result = NicknameValidator.validate('123player');
        expect(result).toBeNull();
      });

      it('should validate single character repeated (valid case)', () => {
        const result = NicknameValidator.validate('aaa');
        expect(result).toBeNull();
      });

      it('should trim tabs as whitespace', () => {
        const result = NicknameValidator.validate('\tPlayer\t');
        expect(result).toBeNull();
      });

      it('should return length error for trimmed result being too short', () => {
        // "  a  " trims to "a" which is 1 char - too short
        const result = NicknameValidator.validate('  a  ');
        expect(result).toBe('Nickname must be at least 3 characters');
      });
    });

    // -----------------------
    // Error Priority Tests
    // -----------------------
    describe('error priority', () => {
      it('should prioritize "required" over length error', () => {
        const result = NicknameValidator.validate('');
        expect(result).toBe('Nickname is required');
      });

      it('should prioritize length error over character error', () => {
        // "!!" is 2 chars (too short) AND has invalid chars
        // Length error should come first
        const result = NicknameValidator.validate('!!');
        expect(result).toBe('Nickname must be at least 3 characters');
      });

      it('should show character error if length is valid', () => {
        // "!!!" is 3 chars (valid length) but has invalid chars
        const result = NicknameValidator.validate('!!!');
        expect(result).toBe(
          'Only letters, numbers, underscores, and hyphens are allowed'
        );
      });
    });
  });

  // =====================
  // SECTION: isValid()
  // =====================
  describe('isValid()', () => {
    describe('valid nicknames', () => {
      it('should return true for valid nickname', () => {
        expect(NicknameValidator.isValid('Player123')).toBe(true);
      });

      it('should return true for minimum length nickname', () => {
        expect(NicknameValidator.isValid('abc')).toBe(true);
      });

      it('should return true for maximum length nickname', () => {
        expect(NicknameValidator.isValid('abcdefghij123456')).toBe(true);
      });

      it('should return true for nickname with underscores', () => {
        expect(NicknameValidator.isValid('cool_player')).toBe(true);
      });
    });

    describe('invalid nicknames', () => {
      it('should return false for empty string', () => {
        expect(NicknameValidator.isValid('')).toBe(false);
      });

      it('should return false for too short nickname', () => {
        expect(NicknameValidator.isValid('ab')).toBe(false);
      });

      it('should return false for too long nickname', () => {
        expect(NicknameValidator.isValid('abcdefghij1234567')).toBe(false);
      });

      it('should return false for nickname with invalid characters', () => {
        expect(NicknameValidator.isValid('player@crypto')).toBe(false);
      });

      it('should return false for nickname with spaces', () => {
        expect(NicknameValidator.isValid('Hello World')).toBe(false);
      });

      it('should return false for whitespace-only string', () => {
        expect(NicknameValidator.isValid('   ')).toBe(false);
      });
    });

    describe('consistency with validate()', () => {
      it('should return true when validate() returns null', () => {
        const nickname = 'ValidPlayer';
        const validateResult = NicknameValidator.validate(nickname);
        const isValidResult = NicknameValidator.isValid(nickname);

        expect(validateResult).toBeNull();
        expect(isValidResult).toBe(true);
      });

      it('should return false when validate() returns error message', () => {
        const nickname = 'a'; // too short
        const validateResult = NicknameValidator.validate(nickname);
        const isValidResult = NicknameValidator.isValid(nickname);

        expect(validateResult).not.toBeNull();
        expect(isValidResult).toBe(false);
      });
    });
  });
});
