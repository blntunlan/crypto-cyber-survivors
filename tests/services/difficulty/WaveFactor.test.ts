/**
 * Wave Factor Calculator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateWaveFactor,
  getPhaseConfig,
  isInBossWave,
  isInResolutionPhase,
  getPhaseTimeline,
} from '../../../services/difficulty/factors/WaveFactor';

describe('WaveFactor', () => {
  const cycleDuration = 300;

  describe('calculateWaveFactor', () => {
    it('should return warmup phase at cycle start', () => {
      const result = calculateWaveFactor({ elapsedSeconds: 0, cycleDuration });
      expect(result.phase).toBe('warmup');
      expect(result.factor).toBe(0.3);
    });

    it('should return buildup phase after warmup', () => {
      const result = calculateWaveFactor({ elapsedSeconds: 30, cycleDuration });
      expect(result.phase).toBe('buildup');
      expect(result.factor).toBe(0.5);
    });

    it('should return firstPeak phase', () => {
      // warmup: 25s, buildup: 60s => firstPeak starts at 85s
      const result = calculateWaveFactor({ elapsedSeconds: 90, cycleDuration });
      expect(result.phase).toBe('firstPeak');
      expect(result.factor).toBe(1.3);
    });

    it('should return climax phase (boss wave)', () => {
      // warmup: 25, buildup: 60, firstPeak: 30, breather: 45, escalation: 60 = 220
      // climax starts at 220s
      const result = calculateWaveFactor({ elapsedSeconds: 230, cycleDuration });
      expect(result.phase).toBe('climax');
      expect(result.factor).toBe(1.5);
    });

    it('should return resolution phase at cycle end', () => {
      // resolution starts at 265s (220 + 45 climax)
      const result = calculateWaveFactor({ elapsedSeconds: 280, cycleDuration });
      expect(result.phase).toBe('resolution');
      expect(result.factor).toBe(0.5);
    });

    it('should wrap around for multiple cycles', () => {
      // Second cycle, warmup phase
      const result = calculateWaveFactor({ elapsedSeconds: 310, cycleDuration });
      expect(result.phase).toBe('warmup');
    });

    it('should calculate phase progress correctly', () => {
      // Warmup is 25s, at 12.5s we should be ~50% through
      const result = calculateWaveFactor({ elapsedSeconds: 12.5, cycleDuration });
      expect(result.phaseProgress).toBeCloseTo(0.5, 1);
    });
  });

  describe('getPhaseConfig', () => {
    it('should return correct phase config', () => {
      const warmup = getPhaseConfig('warmup');
      expect(warmup.duration).toBe(25);
      expect(warmup.multiplier).toBe(0.3);

      const climax = getPhaseConfig('climax');
      expect(climax.duration).toBe(45);
      expect(climax.multiplier).toBe(1.5);
    });
  });

  describe('isInBossWave', () => {
    it('should return true during climax phase', () => {
      expect(isInBossWave(230)).toBe(true);
    });

    it('should return false during other phases', () => {
      expect(isInBossWave(0)).toBe(false);
      expect(isInBossWave(100)).toBe(false);
    });
  });

  describe('isInResolutionPhase', () => {
    it('should return true during resolution phase', () => {
      expect(isInResolutionPhase(280)).toBe(true);
    });

    it('should return false during other phases', () => {
      expect(isInResolutionPhase(0)).toBe(false);
      expect(isInResolutionPhase(100)).toBe(false);
    });
  });

  describe('getPhaseTimeline', () => {
    it('should return all 7 phases', () => {
      const timeline = getPhaseTimeline();
      expect(timeline).toHaveLength(7);
    });

    it('should have correct start and end times', () => {
      const timeline = getPhaseTimeline();

      expect(timeline[0].phase).toBe('warmup');
      expect(timeline[0].startTime).toBe(0);
      expect(timeline[0].endTime).toBe(25);

      // Last phase should end at 300
      const lastPhase = timeline[timeline.length - 1];
      expect(lastPhase.phase).toBe('resolution');
      expect(lastPhase.endTime).toBe(300);
    });
  });
});
