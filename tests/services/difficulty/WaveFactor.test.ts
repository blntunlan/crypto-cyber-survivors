/**
 * Wave Factor Calculator Tests
 *
 * @deprecated AI Director V2: Wave system removed
 * These tests verify the deprecated stub functions return expected values
 * for backwards compatibility.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateWaveFactor,
  getPhaseConfig,
  isInBossWave,
  isInResolutionPhase,
  getPhaseTimeline,
} from '../../../services/difficulty/factors/WaveFactor';

describe('WaveFactor (DEPRECATED - AI Director V2)', () => {
  const cycleDuration = 300;

  describe('calculateWaveFactor', () => {
    it('should always return "active" phase (deprecated)', () => {
      const result = calculateWaveFactor({ elapsedSeconds: 0, cycleDuration });
      expect(result.phase).toBe('active');
      expect(result.factor).toBe(1.0);
    });

    it('should return consistent values regardless of time', () => {
      const result1 = calculateWaveFactor({ elapsedSeconds: 0, cycleDuration });
      const result2 = calculateWaveFactor({ elapsedSeconds: 150, cycleDuration });
      const result3 = calculateWaveFactor({ elapsedSeconds: 300, cycleDuration });

      expect(result1.phase).toBe(result2.phase);
      expect(result2.phase).toBe(result3.phase);
      expect(result1.factor).toBe(result2.factor);
    });
  });

  describe('getPhaseConfig', () => {
    it('should return "active" phase config (deprecated)', () => {
      const config = getPhaseConfig('warmup');
      expect(config.name).toBe('active');
      expect(config.multiplier).toBe(1.0);
    });
  });

  describe('isInBossWave', () => {
    it('should always return false (deprecated)', () => {
      expect(isInBossWave(0)).toBe(false);
      expect(isInBossWave(230)).toBe(false);
      expect(isInBossWave(500)).toBe(false);
    });
  });

  describe('isInResolutionPhase', () => {
    it('should always return false (deprecated)', () => {
      expect(isInResolutionPhase(0)).toBe(false);
      expect(isInResolutionPhase(280)).toBe(false);
      expect(isInResolutionPhase(500)).toBe(false);
    });
  });

  describe('getPhaseTimeline', () => {
    it('should return single "active" phase (deprecated)', () => {
      const timeline = getPhaseTimeline();
      expect(timeline).toHaveLength(1);
      expect(timeline[0]!.phase).toBe('active');
    });

    it('should have correct timeline structure', () => {
      const timeline = getPhaseTimeline(600);
      expect(timeline[0]!.startTime).toBe(0);
      expect(timeline[0]!.endTime).toBe(600);
      expect(timeline[0]!.multiplier).toBe(1.0);
    });
  });
});

