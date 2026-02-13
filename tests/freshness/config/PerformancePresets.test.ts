import { describe, it, expect } from 'vitest';
import {
  PERFORMANCE_PRESETS,
  PROFILE_THRESHOLDS,
  BENCHMARK_CONFIG,
  getPerformanceConfig,
  getProfileFromScore,
  calculateCombinedScore,
} from '../../../config/PerformancePresets';
import { DeviceProfile } from '../../../types/DeviceProfile';

describe('PerformancePresets', () => {
  it('maps every device profile to a matching preset', () => {
    for (const profile of Object.values(DeviceProfile)) {
      const preset = PERFORMANCE_PRESETS[profile];
      expect(preset.profile).toBe(profile);
      expect(preset.candleCount).toBeGreaterThan(0);
      expect([30, 60]).toContain(preset.targetFPS);
    }
  });

  it('derives profile boundaries from combined score', () => {
    expect(getProfileFromScore(PROFILE_THRESHOLDS.ULTRA)).toBe(DeviceProfile.ULTRA);
    expect(getProfileFromScore(PROFILE_THRESHOLDS.ULTRA - 1)).toBe(DeviceProfile.HIGH);
    expect(getProfileFromScore(PROFILE_THRESHOLDS.HIGH)).toBe(DeviceProfile.HIGH);
    expect(getProfileFromScore(PROFILE_THRESHOLDS.MEDIUM)).toBe(DeviceProfile.MEDIUM);
    expect(getProfileFromScore(PROFILE_THRESHOLDS.MEDIUM - 1)).toBe(DeviceProfile.LOW);
  });

  it('calculates weighted and rounded combined score (GPU 70%, CPU 30%)', () => {
    expect(calculateCombinedScore(100, 0)).toBe(70);
    expect(calculateCombinedScore(0, 100)).toBe(30);
    expect(calculateCombinedScore(101, 102)).toBe(101);
  });

  it('returns preset lookup consistently through helper', () => {
    const high = getPerformanceConfig(DeviceProfile.HIGH);
    expect(high).toBe(PERFORMANCE_PRESETS[DeviceProfile.HIGH]);
    expect(BENCHMARK_CONFIG.CACHE_DURATION_MS).toBeGreaterThan(0);
  });
});
