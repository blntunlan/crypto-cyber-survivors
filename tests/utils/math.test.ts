import { describe, it, expect } from 'vitest';
import {
  lerp,
  clamp,
  mapRange,
  roundTo,
  scalePerFrameRatio,
  smoothstep,
} from '../../utils/math';

describe('math utilities', () => {
  describe('lerp', () => {
    it('should interpolate between two values', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
    });

    it('should handle negative values', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
      expect(lerp(-5, -15, 0.5)).toBe(-10);
    });

    it('should handle decimal values', () => {
      expect(lerp(0, 1, 0.25)).toBe(0.25);
      expect(lerp(1.5, 2.5, 0.8)).toBe(2.3);
    });
  });

  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(clamp(0, 0, 0)).toBe(0);
      expect(clamp(10, 10, 10)).toBe(10);
      expect(clamp(5, 10, 0)).toBe(10); // min > max, returns max
    });

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, 0)).toBe(-5);
      expect(clamp(-15, -10, 0)).toBe(-10);
      expect(clamp(5, -10, 0)).toBe(0);
    });
  });

  describe('mapRange', () => {
    it('should map values from one range to another', () => {
      expect(mapRange(50, 0, 100, 0, 1)).toBe(0.5);
      expect(mapRange(0, 0, 100, 0, 1)).toBe(0);
      expect(mapRange(100, 0, 100, 0, 1)).toBe(1);
    });

    it('should handle inverse mapping', () => {
      expect(mapRange(0.5, 0, 1, 0, 100)).toBe(50);
      expect(mapRange(0.25, 0, 1, 0, 255)).toBe(63.75);
    });

    it('should handle negative ranges', () => {
      expect(mapRange(0, -10, 10, -100, 100)).toBe(0);
      expect(mapRange(5, -10, 10, -100, 100)).toBe(50);
    });
  });

  describe('roundTo', () => {
    it('should round to specified decimal places', () => {
      expect(roundTo(3.14159, 2)).toBe(3.14);
      expect(roundTo(3.14159, 0)).toBe(3);
      expect(roundTo(3.5, 0)).toBe(4);
    });

    it('should handle negative numbers', () => {
      expect(roundTo(-3.14159, 2)).toBe(-3.14);
      expect(roundTo(-3.5, 0)).toBe(-3); // Math.round rounds -3.5 to -3
    });

    it('should handle zero decimals', () => {
      expect(roundTo(123.456, 0)).toBe(123);
      expect(roundTo(-123.456, 0)).toBe(-123);
    });

    it('should handle edge cases', () => {
      expect(roundTo(0, 2)).toBe(0);
      expect(roundTo(1.005, 2)).toBe(1); // 1.005 rounds to 1.01, but due to floating point precision it might be 1.00
    });
  });

  describe('smoothstep', () => {
    it('should clamp values outside range', () => {
      expect(smoothstep(0, 10, -5)).toBe(0);
      expect(smoothstep(0, 10, 15)).toBe(1);
    });

    it('should return 0.5 at the midpoint', () => {
      expect(smoothstep(0, 10, 5)).toBe(0.5);
    });

    it('should calculate smooth transition inside range', () => {
      expect(smoothstep(0, 1, 0.25)).toBe(0.15625);
    });
  });

  describe('scalePerFrameRatio', () => {
    it('preserves the same accumulated ratio across frame rates', () => {
      const fullFrame = scalePerFrameRatio(0.3, 1);
      const halfFrame = scalePerFrameRatio(0.3, 0.5);
      const twoHalfFrames = 1 - (1 - halfFrame) * (1 - halfFrame);

      expect(twoHalfFrames).toBeCloseTo(fullFrame, 12);
      expect(scalePerFrameRatio(0.3, 0)).toBe(0);
      expect(scalePerFrameRatio(2, 1)).toBe(1);
    });
  });
});
