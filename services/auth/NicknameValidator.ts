/**
 * NicknameValidator - Validates player nicknames for the beta system.
 *
 * Rules:
 * - 3 to 16 characters long.
 * - Only alphanumeric characters and underscores allowed.
 */

export class NicknameValidator {
  private static readonly NICKNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
  private static readonly MIN_LENGTH = 3;
  private static readonly MAX_LENGTH = 16;

  /**
   * Validates a nickname.
   * @param nickname The nickname to validate.
   * @returns An error message if invalid, or null if valid.
   */
  static validate(nickname: string): string | null {
    if (!nickname) {
      return 'Nickname is required';
    }

    const trimmed = nickname.trim();

    if (trimmed.length < this.MIN_LENGTH) {
      return `Nickname must be at least ${this.MIN_LENGTH} characters`;
    }

    if (trimmed.length > this.MAX_LENGTH) {
      return `Nickname must be at most ${this.MAX_LENGTH} characters`;
    }

    if (!this.NICKNAME_REGEX.test(trimmed)) {
      return 'Only letters, numbers, underscores, and hyphens are allowed';
    }

    return null;
  }

  /**
   * Checks if a nickname matches the format rules without returning a message.
   */
  static isValid(nickname: string): boolean {
    return this.validate(nickname) === null;
  }
}
