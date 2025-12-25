import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlayerTracker } from '../../../services/analytics/PlayerTracker';

// Mock dependencies
vi.mock('../../../services/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Create a flexible mock for Supabase
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../../../services/supabase', () => ({
  supabase: mockSupabase,
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getPlayerId: vi.fn().mockReturnValue('test-player-id'),
    getNickname: vi.fn().mockReturnValue('test-nickname'),
  },
}));

import { isSupabaseConfigured } from '../../../services/supabase';
import { UserSessionService } from '../../../services/auth/UserSessionService';

describe('PlayerTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PlayerTracker.resetForTesting();

    // Default setup for successful fetch
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockSupabase.single.mockResolvedValue({
      data: { id: 'test-id', display_name: 'test' },
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const waitForInit = async (tracker: any) => {
    let attempts = 0;
    while (!tracker.getCurrentPlayer() && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 5));
      attempts++;
    }
  };

  describe('initialization', () => {
    it('should initialize player if not exists', async () => {
      // Arrange
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'test-player-id',
          display_name: 'test-nickname',
          created_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          total_sessions: 1,
        },
        error: null,
      });

      // Act
      const tracker = PlayerTracker.getInstance();
      await waitForInit(tracker);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('players');
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(tracker.getCurrentPlayer()).not.toBeNull();
      expect(tracker.getCurrentPlayer()?.displayName).toBe('test-nickname');
    });

    it('should update existing player on initialization', async () => {
      // Arrange
      const existingPlayer = {
        id: 'test-player-id',
        display_name: 'test-nickname',
        created_at: '2023-01-01',
        last_seen_at: '2023-01-01',
        total_sessions: 5,
      };
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: existingPlayer, error: null });
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      // fallback for update error or next single()
      mockSupabase.single.mockResolvedValue({ data: {}, error: null });

      // Act
      const tracker = PlayerTracker.getInstance();
      await waitForInit(tracker);

      // Assert
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          total_sessions: 6,
        })
      );
      expect(tracker.getCurrentPlayer()?.totalSessions).toBe(6);
    });

    it('should skip initialization if Supabase is not configured', async () => {
      // Arrange
      (isSupabaseConfigured as any).mockReturnValueOnce(false);

      // Act
      const tracker = PlayerTracker.getInstance();
      await new Promise(resolve => setTimeout(resolve, 20));

      // Assert
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(tracker.getCurrentPlayer()).toBeNull();
    });

    it('should skip initialization for anonymous players', async () => {
      // Arrange
      (UserSessionService.getPlayerId as any).mockReturnValueOnce('anon-12345');

      // Act
      const tracker = PlayerTracker.getInstance();
      await new Promise(resolve => setTimeout(resolve, 20));

      // Assert
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(tracker.getCurrentPlayer()).toBeNull();
    });
  });

  describe('heartbeat', () => {
    it('should start heartbeat after successful initialization', async () => {
      // We need to use fake timers BEFORE the tracker is instantiated
      // so it uses the mocked setInterval
      vi.useFakeTimers();

      const existingPlayer = {
        id: 'test-id',
        display_name: 'test',
        total_sessions: 1,
      };
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: existingPlayer, error: null });

      // Act
      PlayerTracker.getInstance();

      // Advance timers to allow the async init (the void initializePlayer()) to proceed
      // Since it's async but no timers are explicitly used inside initializePlayer
      // except the one we just mocked with setInterval later.
      // We need to run pending promises.
      vi.runAllTicks();

      // Wait for the async work
      // In fake timer mode, we can't easily "wait" for microtasks with real setTimeout
      // but vi.advanceTimersByTime(0) or runAllTicks usually works.
      await vi.advanceTimersByTimeAsync(0);

      // Advance time by 5 minutes
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      // Assert
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('should stop heartbeat when stop() is called', async () => {
      vi.useFakeTimers();
      const existingPlayer = {
        id: 'test-id',
        display_name: 'test',
        total_sessions: 1,
      };
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: existingPlayer, error: null });
      const tracker = PlayerTracker.getInstance();
      await vi.advanceTimersByTimeAsync(100);

      // Act
      tracker.stop();
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);

      // Assert
      // First call was during init, shouldn't be a second call from heartbeat
      const updateCalls = mockSupabase.update.mock.calls.length;
      expect(updateCalls).toBe(1);
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

      expect(mockSupabase.from).toHaveBeenCalledWith('device_profiles');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          fingerprint: 'fingerprint-123',
          device_type: 'desktop',
        }),
        expect.any(Object)
      );
    });
  });

  describe('high score', () => {
    it('should update high score if new score is higher', async () => {
      // Arrange
      const existingPlayer = {
        id: 'test-player-id',
        display_name: 'test-nickname',
        created_at: '2023-01-01',
        last_seen_at: '2023-01-01',
        total_sessions: 1,
        high_score: 100,
      };
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: existingPlayer, error: null });

      const tracker = PlayerTracker.getInstance();
      await waitForInit(tracker);

      // Verify initial high score
      expect(tracker.getHighScore()).toBe(100);

      // Setup mock for updateHighScore call
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      // Act
      const result = await tracker.updateHighScore(200);

      // Assert
      expect(result).toBe(true);
      expect(tracker.getHighScore()).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ high_score: 200 })
      );
    });

    it('should not update high score if new score is lower', async () => {
      // Arrange
      const existingPlayer = {
        id: 'test-player-id',
        display_name: 'test-nickname',
        created_at: '2023-01-01',
        last_seen_at: '2023-01-01',
        total_sessions: 1,
        high_score: 500,
      };
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: existingPlayer, error: null });

      const tracker = PlayerTracker.getInstance();
      await waitForInit(tracker);

      // Verify initial high score loaded
      expect(tracker.getHighScore()).toBe(500);

      // Clear update mock calls from init
      mockSupabase.update.mockClear();

      // Act
      const result = await tracker.updateHighScore(100);

      // Assert
      expect(result).toBe(false);
      expect(tracker.getHighScore()).toBe(500); // Should remain unchanged
      // update should NOT have been called for high_score
      expect(mockSupabase.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ high_score: expect.anything() })
      );
    });

    it('should return 0 if no player is initialized', async () => {
      // Arrange
      (isSupabaseConfigured as any).mockReturnValue(false);
      const tracker = PlayerTracker.getInstance();
      await new Promise(resolve => setTimeout(resolve, 20));

      // Assert
      expect(tracker.getHighScore()).toBe(0);
    });
  });
});
