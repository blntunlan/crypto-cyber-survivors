import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorTracker } from '../../../services/analytics/ErrorTracker';

// Mock Dependencies
vi.mock('../../../services/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getPlayerId: vi.fn().mockReturnValue('test-player-id'),
    getNickname: vi.fn().mockReturnValue('Tester'),
  },
}));

// Mock Supabase
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
  },
}));

vi.mock('../../../services/Supabase', () => ({
  supabase: mockSupabase as any,
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

describe('ErrorTracker', () => {
  let tracker: ErrorTracker;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    ErrorTracker.resetForTesting();
    tracker = ErrorTracker.getInstance();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('captureError', () => {
    it('should send error to Supabase when online', async () => {
      tracker.captureError({
        errorType: 'TestError',
        errorMessage: 'Something went wrong',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('error_reports');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'TestError',
          error_message: 'Something went wrong',
        })
      );
    });

    it('should queue error when offline', async () => {
      // Force offline
      (tracker as any).isOnline = false;

      tracker.captureError({
        errorType: 'OfflineError',
        errorMessage: 'Waiting for internet',
      });

      expect(mockSupabase.insert).not.toHaveBeenCalled();
      expect(localStorage.getItem('error_tracker_queue')).not.toBeNull();
    });

    it('should rate limit unique errors', async () => {
      const err = { errorType: 'LimitMe', errorMessage: 'Message' };

      tracker.captureError(err);
      tracker.captureError(err);
      tracker.captureError(err);

      expect(mockSupabase.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('breadcrumbs', () => {
    it('should track user actions', () => {
      tracker.addBreadcrumb('ui', 'Button click');
      tracker.addBreadcrumb('game', 'Level up');

      const stats = tracker.getStats();
      // +1 for initialization breadcrumb
      expect(stats.breadcrumbsCount).toBe(3);
    });

    it('should limit breadcrumbs to MAX_BREADCRUMBS', () => {
      for (let i = 0; i < 50; i++) {
        tracker.addBreadcrumb('test', `Breadcrumb ${i}`);
      }

      const stats = tracker.getStats();
      expect(stats.breadcrumbsCount).toBe(25); // MAX_BREADCRUMBS is 25
    });
  });

  describe('network interception', () => {
    it('should capture failed fetch requests', async () => {
      // Mock fetch BEFORE getting instance or manually trigger the setup
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: 'https://api.example.com',
      });

      const originalFetch = window.fetch;
      window.fetch = mockFetch;

      // Re-initialize to wrap our mock
      ErrorTracker.resetForTesting();
      ErrorTracker.getInstance();

      await window.fetch('https://api.example.com');

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'NetworkError',
        })
      );

      window.fetch = originalFetch;
    });
  });

  describe('console interception', () => {
    it('should capture console.error', () => {
      console.error('Console Failure');

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'ConsoleError',
          error_message: 'Console Failure',
        })
      );
    });
  });

  describe('queue processing', () => {
    it('should process queue when back online', async () => {
      (tracker as any).isOnline = false;
      tracker.captureError({ errorType: 'Queued', errorMessage: 'Later' });

      expect(mockSupabase.insert).not.toHaveBeenCalled();

      // Simulate back online
      (tracker as any).isOnline = true;
      window.dispatchEvent(new Event('online'));

      // Fast forward interval or manual trigger
      await (tracker as any).processQueue();

      expect(mockSupabase.insert).toHaveBeenCalled();
    });
  });
});
