import { vi } from 'vitest';

// Mock RailwayClient
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock('../../../services/api/RailwayClient', () => ({
  railwayClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlayerTracker } from '../../../services/analytics/PlayerTracker';
import { UserSessionService } from '../../../services/auth/UserSessionService';

// Mock other dependencies
vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getProfileId: vi.fn().mockReturnValue('test-profile-id'),
    getNickname: vi.fn().mockReturnValue('test-nickname'),
  },
}));

// Set Railway API URL
vi.stubEnv('VITE_RAILWAY_API_URL', 'http://localhost:3001');

describe('PlayerTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PlayerTracker.resetForTesting();

    // Default: profile exists
    mockGet.mockResolvedValue({
      id: 'test-profile-id',
      nickname: 'test-nickname',
      display_name: 'test-nickname',
      created_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    });
    mockPost.mockResolvedValue({ accepted: true });
    mockPatch.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const waitForInit = async (tracker: PlayerTracker) => {
    let attempts = 0;
    while (!tracker.getCurrentPlayer() && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 5));
      attempts++;
    }
  };

  describe('initialization', () => {
    it('should initialize player if not exists', async () => {
      // GET profile fails (404), POST creates it
      mockGet.mockRejectedValueOnce(new Error('404'));
      mockPost.mockResolvedValueOnce({
        id: 'test-profile-id',
        nickname: 'test-nickname',
        display_name: 'test-nickname',
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      });

      const tracker = PlayerTracker.getInstance();
      await waitForInit(tracker);

      expect(mockPost).toHaveBeenCalledWith('/api/v1/profile', {
        nickname: 'test-nickname',
      });
      expect(tracker.getCurrentPlayer()).not.toBeNull();
      expect(tracker.getCurrentPlayer()?.displayName).toBe('test-nickname');
    });

    it('should update existing player on initialization', async () => {
      mockGet.mockResolvedValueOnce({
        id: 'test-profile-id',
        nickname: 'test-nickname',
        display_name: 'test-nickname',
        created_at: '2023-01-01',
        last_seen_at: '2023-01-01',
      });

      const tracker = PlayerTracker.getInstance();
      await waitForInit(tracker);

      expect(mockGet).toHaveBeenCalledWith('/api/v1/profile');
      expect(tracker.getCurrentPlayer()?.displayName).toBe('test-nickname');
    });

    it('should skip initialization if Railway API is not configured', async () => {
      vi.stubEnv('VITE_RAILWAY_API_URL', '');

      const tracker = PlayerTracker.getInstance();
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockGet).not.toHaveBeenCalled();
      expect(tracker.getCurrentPlayer()).toBeNull();

      // Restore
      vi.stubEnv('VITE_RAILWAY_API_URL', 'http://localhost:3001');
    });

    it('should skip initialization for anonymous players', async () => {
      (UserSessionService.getProfileId as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        'anon_12345'
      );

      const tracker = PlayerTracker.getInstance();
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockGet).not.toHaveBeenCalled();
      expect(tracker.getCurrentPlayer()).toBeNull();
    });
  });

  describe('heartbeat', () => {
    it('should start heartbeat after successful initialization', async () => {
      vi.useFakeTimers();

      mockGet.mockResolvedValueOnce({
        id: 'test-id',
        nickname: 'test',
        display_name: 'test',
      });

      PlayerTracker.getInstance();

      vi.runAllTicks();
      await vi.advanceTimersByTimeAsync(0);

      // Advance time by 5 minutes
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      expect(mockPatch).toHaveBeenCalledWith('/api/v1/profile', {});
    });

    it('should stop heartbeat when stop() is called', async () => {
      vi.useFakeTimers();

      mockGet.mockResolvedValueOnce({
        id: 'test-id',
        nickname: 'test',
        display_name: 'test',
      });

      const tracker = PlayerTracker.getInstance();

      vi.runAllTicks();
      await vi.advanceTimersByTimeAsync(100);

      tracker.stop();
      mockPatch.mockClear();

      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);

      expect(mockPatch).not.toHaveBeenCalled();
    });
  });

  describe('trackDeviceProfile', () => {
    it('should upsert device profile', async () => {
      const tracker = PlayerTracker.getInstance();
      const profile = {
        deviceType: 'desktop',
        browser: 'chrome',
        screenWidth: 1920,
        screenHeight: 1080,
        hardwareConcurrency: 8,
        recommendedProfile: 'high',
      };

      await tracker.trackDeviceProfile('fingerprint-123', profile);

      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/telemetry/device-profiles',
        expect.objectContaining({
          fingerprint: 'fingerprint-123',
          device_type: 'desktop',
        })
      );
    });
  });

  describe('high score', () => {
    it('should update high score if new score is higher', async () => {
      mockGet.mockResolvedValueOnce({
        id: 'test-profile-id',
        nickname: 'test-nickname',
        display_name: 'test-nickname',
        created_at: '2023-01-01',
        last_seen_at: '2023-01-01',
      });

      const tracker = PlayerTracker.getInstance();
      await waitForInit(tracker);

      // Default highScore is 0
      const result = await tracker.updateHighScore(200);

      expect(result).toBe(true);
      expect(tracker.getHighScore()).toBe(200);
    });

    it('should not update high score if new score is lower', async () => {
      mockGet.mockResolvedValueOnce({
        id: 'test-profile-id',
        nickname: 'test-nickname',
        display_name: 'test-nickname',
        created_at: '2023-01-01',
        last_seen_at: '2023-01-01',
      });

      const tracker = PlayerTracker.getInstance();
      await waitForInit(tracker);

      // Set an initial high score
      await tracker.updateHighScore(500);

      const result = await tracker.updateHighScore(100);

      expect(result).toBe(false);
      expect(tracker.getHighScore()).toBe(500);
    });

    it('should return 0 if no player is initialized', async () => {
      vi.stubEnv('VITE_RAILWAY_API_URL', '');
      const tracker = PlayerTracker.getInstance();
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(tracker.getHighScore()).toBe(0);

      vi.stubEnv('VITE_RAILWAY_API_URL', 'http://localhost:3001');
    });
  });
});
