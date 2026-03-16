import { vi } from 'vitest';

// 1. Mock fetch for Railway telemetry endpoint
const mockFetchImpl = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ accepted: 1 }),
});

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
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Store and replace fetch
    originalFetch = window.fetch;

    // Set Railway API URL
    import.meta.env.VITE_RAILWAY_API_URL = 'http://localhost:3001';

    ErrorTracker.resetForTesting();
    tracker = ErrorTracker.getInstance();
    (tracker as any).isOnline = true;

    // Intercept the wrapped fetch to track telemetry calls
    const wrappedFetch = window.fetch;
    window.fetch = vi.fn(async (...args: Parameters<typeof fetch>) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      if (url.includes('/telemetry/')) {
        return mockFetchImpl(...args);
      }
      // For non-telemetry, use the real wrapped fetch
      return wrappedFetch(...args);
    }) as typeof fetch;

    vi.useFakeTimers();
  });

  afterEach(() => {
    window.fetch = originalFetch;
    vi.useRealTimers();
  });

  describe('captureError', () => {
    it('should send error to Railway when online', async () => {
      await tracker.captureError({
        errorType: 'TestError',
        errorMessage: 'Something went wrong',
      });

      expect(mockFetchImpl).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/telemetry/errors',
        expect.objectContaining({
          method: 'POST',
        })
      );

      // Verify the body contains the error data
      const callArgs = mockFetchImpl.mock.calls[0];
      const callBody = JSON.parse((callArgs?.[1] as RequestInit).body as string);
      expect(callBody.errorType).toBe('TestError');
      expect(callBody.errorMessage).toBe('Something went wrong');
    });

    it('should queue error when offline', async () => {
      (tracker as any).isOnline = false;

      await tracker.captureError({
        errorType: 'OfflineError',
        errorMessage: 'Waiting for internet',
      });

      expect(mockFetchImpl).not.toHaveBeenCalled();
      expect(localStorage.getItem('error_tracker_queue')).not.toBeNull();
    });

    it('should rate limit unique errors', async () => {
      const err = { errorType: 'LimitMe', errorMessage: 'Message' };

      await tracker.captureError(err);
      await tracker.captureError(err);
      await tracker.captureError(err);

      expect(mockFetchImpl).toHaveBeenCalledTimes(1);
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
      // Store the current (wrapped) fetch
      const wrappedFetch = window.fetch;

      // Replace with one that simulates a failing non-telemetry request
      const failingFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: 'https://api.example.com',
        clone: function () {
          return this;
        },
        text: () => Promise.resolve('Error body'),
      });
      window.fetch = failingFetch;

      // Re-initialize tracker so it wraps our mock fetch
      ErrorTracker.resetForTesting();
      const newTracker = ErrorTracker.getInstance();
      (newTracker as any).isOnline = true;

      // Intercept wrapped fetch for telemetry
      const newWrappedFetch = window.fetch;
      window.fetch = vi.fn(async (...args: Parameters<typeof fetch>) => {
        const url = typeof args[0] === 'string' ? args[0] : '';
        if (url.includes('/telemetry/')) {
          return mockFetchImpl(...args);
        }
        return newWrappedFetch(...args);
      }) as typeof fetch;

      await window.fetch('https://api.example.com');
      await newTracker.flush();

      expect(mockFetchImpl).toHaveBeenCalled();
      const callBody = JSON.parse(
        (mockFetchImpl.mock.calls[0]?.[1] as RequestInit)?.body as string
      );
      expect(callBody.errorType).toBe('NetworkError');

      window.fetch = wrappedFetch;
    });
  });

  describe('console interception', () => {
    it('should capture console.error', async () => {
      console.error('Console Failure');
      await tracker.flush();

      expect(mockFetchImpl).toHaveBeenCalled();
      const calls = mockFetchImpl.mock.calls.filter((c: any) => {
        try {
          const body = JSON.parse(c[1]?.body);
          return body.errorType === 'ConsoleError';
        } catch {
          return false;
        }
      });
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  describe('queue processing', () => {
    it('should process queue when back online', async () => {
      (tracker as any).isOnline = false;
      await tracker.captureError({ errorType: 'Queued', errorMessage: 'Later' });

      expect(mockFetchImpl).not.toHaveBeenCalled();

      // Simulate back online
      (tracker as any).isOnline = true;
      window.dispatchEvent(new Event('online'));

      await (tracker as any).processQueue();

      expect(mockFetchImpl).toHaveBeenCalled();
    });
  });

  describe('external integrations', () => {
    it('should capture errors from Logger.error', async () => {
      const onErrorMock = (
        import.meta.env.VITEST
          ? (await import('../../../services/system/Logger')).Logger.onError
          : null
      ) as any;
      if (onErrorMock?.mock) {
        const callback = onErrorMock.mock.calls[0][0];
        callback('Test Logger Message', new Error('Logger Error'), { extra: 'data' });

        await tracker.flush();

        const calls = mockFetchImpl.mock.calls.filter((c: any) => {
          try {
            const body = JSON.parse(c[1]?.body);
            return body.errorType === 'LoggerError';
          } catch {
            return false;
          }
        });
        expect(calls.length).toBeGreaterThan(0);
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

      const calls = mockFetchImpl.mock.calls.filter((c: any) => {
        try {
          const body = JSON.parse(c[1]?.body);
          return body.errorType === 'UnhandledError';
        } catch {
          return false;
        }
      });
      expect(calls.length).toBeGreaterThan(0);
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

      const calls = mockFetchImpl.mock.calls.filter((c: any) => {
        try {
          const body = JSON.parse(c[1]?.body);
          return body.errorType === 'UnhandledPromiseRejection';
        } catch {
          return false;
        }
      });
      expect(calls.length).toBeGreaterThan(0);
    });
  });
});
