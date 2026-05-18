import { describe, expect, it } from 'vitest';
import { PERFORMANCE_PRESETS } from '../../config/PerformancePresets';
import { DeviceProfile } from '../../types/DeviceProfile';

describe('PerformancePresets', () => {
  it('should scale enemy limits by detected device profile', () => {
    expect(PERFORMANCE_PRESETS[DeviceProfile.LOW].maxEnemies).toBeLessThan(
      PERFORMANCE_PRESETS[DeviceProfile.MEDIUM].maxEnemies
    );
    expect(PERFORMANCE_PRESETS[DeviceProfile.MEDIUM].maxEnemies).toBeLessThan(
      PERFORMANCE_PRESETS[DeviceProfile.HIGH].maxEnemies
    );
    expect(PERFORMANCE_PRESETS[DeviceProfile.HIGH].maxEnemies).toBeLessThan(
      PERFORMANCE_PRESETS[DeviceProfile.ULTRA].maxEnemies
    );
  });

  it('should use performance-first settings for the low profile', () => {
    const low = PERFORMANCE_PRESETS[DeviceProfile.LOW];

    expect(low.targetFPS).toBe(30);
    expect(low.shadowsEnabled).toBe(false);
    expect(low.glowEnabled).toBe(false);
    expect(low.gradientBackground).toBe(false);
    expect(low.particleMultiplier).toBeLessThan(1);
  });
});
