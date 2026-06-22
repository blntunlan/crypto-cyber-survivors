import { describe, expect, it } from 'vitest';
import {
  PERFORMANCE_PRESETS,
  detectHardwareBaseline,
  getProfileFromScore,
} from '../../config/PerformancePresets';
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

  describe('detectHardwareBaseline', () => {
    it('should classify software renderers as LOW baseline and LOW cap', () => {
      const res = detectHardwareBaseline('SwiftShader', 8, 8);
      expect(res.baseline).toBe(DeviceProfile.LOW);
      expect(res.maxPossible).toBe(DeviceProfile.LOW);
    });

    it('should classify dedicated NVIDIA/AMD GPUs as ULTRA baseline', () => {
      const rtx = detectHardwareBaseline('NVIDIA GeForce RTX 4080', 16, 16);
      expect(rtx.baseline).toBe(DeviceProfile.ULTRA);
      expect(rtx.maxPossible).toBeNull();
    });

    it('should classify Apple M-series GPUs as ULTRA baseline', () => {
      const appleM = detectHardwareBaseline('Apple M3', 8, 8);
      expect(appleM.baseline).toBe(DeviceProfile.ULTRA);
      expect(appleM.maxPossible).toBeNull();
    });

    it('should classify modern Apple mobile GPUs as HIGH baseline', () => {
      const appleA = detectHardwareBaseline('Apple GPU', 6, null);
      expect(appleA.baseline).toBe(DeviceProfile.HIGH);
      expect(appleA.maxPossible).toBeNull();
    });

    it('should classify modern Snapdragon Adreno GPUs as HIGH baseline', () => {
      const snapdragon = detectHardwareBaseline('Adreno (TM) 740', 8, 8);
      expect(snapdragon.baseline).toBe(DeviceProfile.HIGH);
      expect(snapdragon.maxPossible).toBeNull();
    });

    it('should classify low-end Adreno GPUs with MEDIUM cap', () => {
      const lowAdreno = detectHardwareBaseline('Adreno (TM) 612', 8, 4);
      expect(lowAdreno.baseline).toBe(DeviceProfile.LOW);
      expect(lowAdreno.maxPossible).toBe(DeviceProfile.MEDIUM);
    });

    it('should classify low-end Mali GPUs with MEDIUM cap', () => {
      const lowMali = detectHardwareBaseline('Mali-G52', 8, 3);
      expect(lowMali.baseline).toBe(DeviceProfile.LOW);
      expect(lowMali.maxPossible).toBe(DeviceProfile.MEDIUM);
    });

    it('should classify integrated desktop GPUs as MEDIUM baseline', () => {
      const intel = detectHardwareBaseline('Intel(R) Iris(R) Xe Graphics', 8, 16);
      expect(intel.baseline).toBe(DeviceProfile.MEDIUM);
      expect(intel.maxPossible).toBeNull();
    });
  });

  describe('getProfileFromScore', () => {
    it('should boost profile to baseline even if benchmark score is low', () => {
      // Score would normally be LOW (<200)
      const score = 100;
      const profile = getProfileFromScore(score, 'Adreno (TM) 740', 8, 8);
      expect(profile).toBe(DeviceProfile.HIGH);
    });

    it('should cap profile to maxPossible even if benchmark score is high', () => {
      // Score would normally be ULTRA (>=800)
      const score = 900;
      const profile = getProfileFromScore(score, 'SwiftShader', 8, 8);
      expect(profile).toBe(DeviceProfile.LOW);
    });

    it('should fall back to score profile when hardware baseline is not defined', () => {
      const profile = getProfileFromScore(600, 'Unknown GPU', 4, 4);
      expect(profile).toBe(DeviceProfile.HIGH); // 600 is HIGH
    });
  });
});
