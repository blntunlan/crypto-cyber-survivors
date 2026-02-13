import { vi } from 'vitest';

// 1. Hoist mocks
const { mockUpsert, mockFrom } = vi.hoisted(() => ({
  mockUpsert: vi.fn().mockResolvedValue({ error: null }),
  mockFrom: vi.fn().mockReturnThis(),
}));

vi.mock('../../../services/core/Supabase', () => ({
  supabase: {
    from: mockFrom,
    upsert: mockUpsert,
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '../../../services/core/Supabase';
import { DeviceProfiler } from '../../../services/analytics/DeviceProfiler';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'mocked-id',
}));

describe('DeviceProfiler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ upsert: mockUpsert });
    mockUpsert.mockResolvedValue({ error: null });
    localStorage.clear();

    // Mock navigator and screen properties
    Object.defineProperty(window.screen, 'width', { value: 1920, configurable: true });
    Object.defineProperty(window.screen, 'height', { value: 1080, configurable: true });
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true,
    });
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

  afterEach(() => {
    vi.restoreAllMocks();
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
        gpu: undefined,
        cores: 8,
        memory: undefined,
      });
    });
  });

  describe('syncToSupabase', () => {
    it('should upsert profile to Supabase', async () => {
      await DeviceProfiler.syncToSupabase();

      expect((supabase as any).from).toHaveBeenCalledWith('device_profiles');
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
      expect((supabase as any).from).not.toHaveBeenCalled();
    });

    it('should identify as mobile if width < 768', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });

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
