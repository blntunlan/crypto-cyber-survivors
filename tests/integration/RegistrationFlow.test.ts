import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserSessionService } from '../../services/auth/UserSessionService';

// Mock SecurityUtils module to simulate non-local environment
vi.mock('../../services/auth/SecurityUtils', () => ({
  SecurityUtils: {
    isLocalEnvironment: vi.fn(() => false),
    generateSecurityHash: vi.fn(() => 'mock-hash'),
    isValidHash: vi.fn(() => true),
  },
}));

// These tests require full MSW integration with Railway API mock responses.
// They work locally but have timing issues in CI due to module hoisting.
// Skip in CI environment where MSW may not fully intercept Railway API calls.
const isCI = process.env.CI === 'true';

describe('Registration Flow (Integration with MSW)', () => {
  beforeEach(() => {
    UserSessionService.clearUser();

    // Bypass localhost check to trigger real-world-like Railway path
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'crypto-survivors.com',
      },
      writable: true,
    });
  });

  it.skipIf(isCI)('should register a new nickname and store it locally', async () => {
    const nickname = 'new_pioneer';

    const result = await UserSessionService.registerNickname(nickname);

    expect(result.success).toBe(true);

    const storedUser = UserSessionService.getLegacyStoredUser();
    expect(storedUser).not.toBeNull();
    expect(storedUser?.nickname).toBe(nickname);
    expect(typeof storedUser?.profileId).toBe('string');
  });

  it.skipIf(isCI)('should recognize and login an existing user', async () => {
    const nickname = 'existing_user';

    const result = await UserSessionService.registerNickname(nickname);

    expect(result.success).toBe(true);

    const storedUser = UserSessionService.getLegacyStoredUser();
    expect(storedUser?.nickname).toBe(nickname);
    expect(typeof storedUser?.profileId).toBe('string');
  });
});
