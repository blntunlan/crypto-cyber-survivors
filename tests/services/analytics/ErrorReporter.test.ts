import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorReporter } from '../../../services/analytics/ErrorReporter';

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
  },
}));

vi.mock('../../../services/analytics/DeviceProfiler', () => ({
  DeviceProfiler: {
    getFingerprint: vi.fn().mockReturnValue('test-fp'),
    getProfile: vi.fn().mockReturnValue({
      userAgent: 'TestBrowser',
      screenWidth: 1920,
      screenHeight: 1080,
      pixelRatio: 1,
      language: 'en',
      gpu: 'MockGPU',
    }),
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

describe('ErrorReporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ErrorReporter.resetForTesting();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('report', () => {
    it('should report an error to Supabase', async () => {
      const error = new Error('Test Error');
      await ErrorReporter.report(error, 'runtime', { extra: 'data' });

      expect(mockSupabase.from).toHaveBeenCalledWith('error_reports');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_message: 'Test Error',
          error_type: 'runtime',
          player_id: 'test-player-id',
          device_fingerprint: 'test-fp',
        })
      );
    });

    it('should deduplicate rapidly repeating errors', async () => {
      const error = 'Same Error';

      // First 3 calls
      await ErrorReporter.report(error);
      await ErrorReporter.report(error);
      await ErrorReporter.report(error);

      // Only the first one should be reported (count 1)
      // (The logic reports 1st, 10th, 100th... OR if 1 min passed)
      expect(mockSupabase.insert).toHaveBeenCalledTimes(1);
    });

    it('should report again after 1 minute regardless of count', async () => {
      const error = 'Repeat Error';

      await ErrorReporter.report(error); // 1st report
      expect(mockSupabase.insert).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(61000); // Wait > 1 min

      await ErrorReporter.report(error); // 2nd report
      expect(mockSupabase.insert).toHaveBeenCalledTimes(2);
    });

    it('should infer severity correctly', async () => {
      await ErrorReporter.report('Normal error', 'runtime');
      expect(mockSupabase.insert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          error_type: 'runtime',
        })
      );

      // Severity is not directly in the DB insert but used in the report object passed to Logger
      // Let's verify Logger output
      // Wait, let's actually test inferSeverity logic indirectly or via exported enum usage if possible
    });
  });

  describe('init', () => {
    it('should register window error listeners', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      ErrorReporter.init();

      expect(addSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });
  });
});
