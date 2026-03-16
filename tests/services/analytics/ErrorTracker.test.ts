import { vi } from 'vitest';

// 1. Hoist all mocks
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
  },
}));

vi.mock('../../../services/core/Supabase', () => ({
  supabase: mockSupabase,
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

// 2. Import Vitest and Service
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorTracker } from '../../../services/analytics/ErrorTracker';

// Mock Dependencies
vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    onError: vi.fn().mockReturnValue(() => {}),
  },
}));

vi.mock('../../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getProfileId: vi.fn().mockReturnValue('550e8400-e29b-41d4-a716-446655440001'),
    getNickname: vi.fn().mockReturnValue('Tester'),
  },
}));

describe('ErrorTracker', () => {
  let tracker: ErrorTracker;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__ALLOW_FETCH_INTERCEPTION_FOR_TESTS__ = true;
    vi.clearAllMocks();
    localStorage.clear();
    ErrorTracker.resetForTesting();
    tracker = ErrorTracker.getInstance();
    (tracker as any).isOnline = true;
    vi.useFakeTimers();
    // Ensure service uses our mock
    // Mock is already applied via vi.mock
    // vi.spyOn(supabase as any, 'from').mockImplementation(mockSupabase.from);
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__ALLOW_FETCH_INTERCEPTION_FOR_TESTS__ = false;
    vi.useRealTimers();
  });

  describe('captureError', () => {
    it('should send error to Supabase when online', async () => {
      await tracker.captureError({
        errorType: 'TestError',
        errorMessage: 'Something went wrong',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('error_reports');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'TestError',
          message: 'Something went wrong',
          profile_id: '550e8400-e29b-41d4-a716-446655440001',
        })
      );
    });

    it('should queue error when offline', async () => {
      // Force offline
      (tracker as any).isOnline = false;

      await tracker.captureError({
        errorType: 'OfflineError',
        errorMessage: 'Waiting for internet',
      });

      expect(mockSupabase.insert).not.toHaveBeenCalled();
      expect(localStorage.getItem('error_tracker_queue')).not.toBeNull();
    });

    it('should rate limit unique errors', async () => {
      const err = { errorType: 'LimitMe', errorMessage: 'Message' };

      await tracker.captureError(err);
      await tracker.captureError(err);
      await tracker.captureError(err);

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
      // Store original fetch
      const originalFetch = window.fetch;

      // Mock fetch that returns a failed response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: 'https://api.example.com',
        clone: function () {
          return this;
        },
        text: () => Promise.resolve('Error body'),
      });
      window.fetch = mockFetch;

      // Re-initialize tracker so it wraps our mock fetch
      ErrorTracker.resetForTesting();
      const newTracker = ErrorTracker.getInstance();
      (newTracker as any).isOnline = true;

      // The wrapped fetch should intercept this call
      await window.fetch('https://api.example.com');

      // Wait for pending async operations
      await newTracker.flush();

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'NetworkError',
        })
      );

      // Restore original fetch
      window.fetch = originalFetch;
    });
  });

  describe('console interception', () => {
    it('should capture console.error', async () => {
      console.error('Console Failure');
      await tracker.flush();

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'ConsoleError',
          message: 'Console Failure',
        })
      );
    });
  });

  describe('queue processing', () => {
    it('should process queue when back online', async () => {
      (tracker as any).isOnline = false;
      await tracker.captureError({ errorType: 'Queued', errorMessage: 'Later' });

      expect(mockSupabase.insert).not.toHaveBeenCalled();

      // Simulate back online
      (tracker as any).isOnline = true;
      window.dispatchEvent(new Event('online'));

      // Fast forward interval or manual trigger
      await (tracker as any).processQueue();

      expect(mockSupabase.insert).toHaveBeenCalled();
    });
  });

  describe('external integrations', () => {
    it('should capture errors from Logger.error', async () => {
      // Setup: we need to trigger the callback that setupLoggerSubscription registered.
      // Since Logger is mocked, we need to inspect how onError was called.
      const onErrorMock = (
        import.meta.env.VITEST
          ? (await import('../../../services/system/Logger')).Logger.onError
          : null
      ) as any;
      if (onErrorMock?.mock) {
        const callback = onErrorMock.mock.calls[0][0];
        callback('Test Logger Message', new Error('Logger Error'), { extra: 'data' });

        await tracker.flush();

        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            error_type: 'LoggerError',
            message: 'Test Logger Message',
          })
        );
      }
    });

    it('should capture window error events', async () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Window error',
        error: new Error('Script failed'),
        filename: 'app.js',
        lineno: 10,
      });

      window.dispatchEvent(errorEvent);
      await tracker.flush();

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'UnhandledError',
          message: 'Window error',
        })
      );
    });

    it('should capture unhandled promise rejections', async () => {
      const p = Promise.reject('fail');
      p.catch(() => {}); // Prevent unhandled rejection in Vitest
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        reason: new Error('Async failed'),
        promise: p,
      });

      window.dispatchEvent(rejectionEvent);
      await tracker.flush();

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'UnhandledPromiseRejection',
          message: 'Async failed',
        })
      );
    });
  });
});
