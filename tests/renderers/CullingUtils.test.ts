import { describe, it, expect } from 'vitest';
import {
  createViewportBounds,
  isCircleVisible,
  updateViewportBounds,
  isPointVisible,
  isRectVisible,
  calculateCullingStats,
} from '../../services/renderers/CullingUtils';

describe('CullingUtils', () => {
  const bounds = createViewportBounds(800, 600, 50);

  describe('createViewportBounds', () => {
    it('should create bounds with correct padding', () => {
      expect(bounds).toEqual({
        left: -50,
        right: 850,
        top: -50,
        bottom: 650,
      });
    });

    it('should use default padding if not provided', () => {
      const defaultBounds = createViewportBounds(800, 600);
      expect(defaultBounds.left).toBe(-50);
    });
  });

  describe('updateViewportBounds', () => {
    it('should update existing bounds in-place with correct padding', () => {
      const bounds = createViewportBounds(0, 0, 0);
      updateViewportBounds(bounds, 800, 600, 50);
      expect(bounds).toEqual({
        left: -50,
        right: 850,
        top: -50,
        bottom: 650,
      });
    });

    it('should use default padding if not provided', () => {
      const bounds = createViewportBounds(0, 0, 0);
      updateViewportBounds(bounds, 800, 600);
      expect(bounds).toEqual({
        left: -50,
        right: 850,
        top: -50,
        bottom: 650,
      });
    });
  });

  describe('isCircleVisible', () => {
    it('should return true if circle is inside or overlapping', () => {
      expect(isCircleVisible(400, 300, 10, bounds)).toBe(true);
      expect(isCircleVisible(-40, 0, 20, bounds)).toBe(true); // Overlapping left
    });

    it('should return false if circle is fully outside', () => {
      expect(isCircleVisible(-100, 0, 10, bounds)).toBe(false);
      expect(isCircleVisible(1000, 300, 10, bounds)).toBe(false);
    });
  });

  describe('isPointVisible', () => {
    it('should return true for points inside', () => {
      expect(isPointVisible(400, 300, bounds)).toBe(true);
      expect(isPointVisible(-50, -50, bounds)).toBe(true);
    });

    it('should return false for points outside', () => {
      expect(isPointVisible(-51, 0, bounds)).toBe(false);
      expect(isPointVisible(400, 651, bounds)).toBe(false);
    });
  });

  describe('isRectVisible', () => {
    it('should return true for rectangles inside or overlapping', () => {
      expect(isRectVisible(400, 300, 50, 50, bounds)).toBe(true);
      expect(isRectVisible(-600, 300, 100, 100, bounds)).toBe(false); // Outside
      expect(isRectVisible(-60, 300, 100, 100, bounds)).toBe(true); // Overlapping left
    });

    it('should return false for rectangles outside', () => {
      expect(isRectVisible(900, 300, 50, 50, bounds)).toBe(false);
    });
  });

  describe('calculateCullingStats', () => {
    it('should calculate correct stats', () => {
      const stats = calculateCullingStats(100, 80);
      expect(stats.totalObjects).toBe(100);
      expect(stats.culledObjects).toBe(20);
      expect(stats.renderedObjects).toBe(80);
      expect(stats.cullingRatio).toBe(0.2);
    });

    it('should handle zero total objects', () => {
      const stats = calculateCullingStats(0, 0);
      expect(stats.cullingRatio).toBe(0);
    });
  });
});
