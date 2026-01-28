import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceProfiler } from '../../../services/analytics/DeviceProfiler';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'mocked-id',
}));

// Mock Supabase - properly structured to return chainable methods
const mockUpsert = vi.fn();
const mockFrom = vi.fn(() => ({
  upsert: mockUpsert,
}));

vi.mock('../../../services/core/Supabase', () => ({
  supabase: {
    from: mockFrom,
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

describe('DeviceProfiler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockClear();
    mockUpsert.mockClear();
    localStorage.clear();

    // Mock navigator and screen properties
    Object.defineProperty(window.screen, 'width', { value: 1920, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 1080, configurable: true });
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'TestBrowser',
      configurable: true,
    });
    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: 8,
      configurable: true,
    });

    // Mock location.hostname
    Object.defineProperty(window, 'location', {
      value: { hostname: 'game.cryptosurvivors.com' },
      configurable: true,
    });
  });

  describe('getFingerprint', () => {
    it('should create and store a new fingerprint if none exists', () => {
      const fp = DeviceProfiler.getFingerprint();
      expect(fp).toBe('df-mocked-id');
      expect(localStorage.getItem('crypto_survivors_fingerprint')).toBe('df-mocked-id');
    });

    it('should return existing fingerprint from localStorage', () => {
      localStorage.setItem('crypto_survivors_fingerprint', 'existing-fp');
      const fp = DeviceProfiler.getFingerprint();
      expect(fp).toBe('existing-fp');
    });
  });

  describe('getProfile', () => {
    it('should collect correct device metadata', () => {
      const profile = DeviceProfiler.getProfile();
      expect(profile).toEqual({
        fingerprint: 'df-mocked-id',
        userAgent: 'TestBrowser',
        screenWidth: 1920,
        screenHeight: 1080,
        pixelRatio: 2,
        language: 'en-US',
        gpu: undefined, // Canvas/GL might not be fully available in jsdom
        cores: 8,
        memory: undefined,
      });
    });
  });

  describe('syncToSupabase', () => {
    it('should upsert profile to Supabase', async () => {
      mockUpsert.mockResolvedValue({ error: null });

      await DeviceProfiler.syncToSupabase();

      expect(mockFrom).toHaveBeenCalledWith('device_profiles');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          fingerprint: 'df-mocked-id',
          screen_width: 1920,
          device_type: 'desktop',
        }),
        { onConflict: 'fingerprint' }
      );
    });

    it('should skip sync on localhost', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost' },
        configurable: true,
      });

      await DeviceProfiler.syncToSupabase();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should identify as mobile if width < 768', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
      mockUpsert.mockResolvedValue({ error: null });

      await DeviceProfiler.syncToSupabase();

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'mobile',
        }),
        expect.anything()
      );
    });
  });
});
