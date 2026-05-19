import { describe, it, expect } from 'vitest';
import {
  createViewportBounds,
  updateViewportBounds,
  isCircleVisible,
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
    it('should update bounds in-place with correct padding', () => {
      const targetBounds = { left: 0, right: 0, top: 0, bottom: 0 };
      updateViewportBounds(targetBounds, 800, 600, 50);
      expect(targetBounds).toEqual({
        left: -50,
        right: 850,
        top: -50,
        bottom: 650,
      });
    });

    it('should use default padding if not provided', () => {
      const targetBounds = { left: 0, right: 0, top: 0, bottom: 0 };
      updateViewportBounds(targetBounds, 800, 600);
      expect(targetBounds.left).toBe(-50);
    });
  });

  describe('isCircleVisible', () => {
    it('should return true if circle is inside or overlapping', () => {
      expect(isCircleVisible(400, 300, 10, bounds)).toBe(true); // Center
      expect(isCircleVisible(-40, 300, 10, bounds)).toBe(true); // Overlapping left
      expect(isCircleVisible(840, 640, 20, bounds)).toBe(true); // Overlapping bottom-right corner
    });

    it('should return false if circle is fully outside', () => {
      expect(isCircleVisible(-100, 300, 10, bounds)).toBe(false); // Too far left
      expect(isCircleVisible(400, -100, 10, bounds)).toBe(false); // Too far up
      expect(isCircleVisible(900, 700, 10, bounds)).toBe(false); // Too far bottom-right
    });
  });

  describe('isPointVisible', () => {
    it('should return true if point is inside', () => {
      expect(isPointVisible(400, 300, bounds)).toBe(true);
      expect(isPointVisible(0, 0, bounds)).toBe(true);
      expect(isPointVisible(-50, -50, bounds)).toBe(true); // Exact edge
    });

    it('should return false if point is outside', () => {
      expect(isPointVisible(-51, 300, bounds)).toBe(false);
      expect(isPointVisible(400, 651, bounds)).toBe(false);
    });
  });

  describe('isRectVisible', () => {
    it('should return true if rect is inside or overlapping', () => {
      expect(isRectVisible(400, 300, 50, 50, bounds)).toBe(true);
      expect(isRectVisible(-60, 300, 50, 50, bounds)).toBe(true); // Right edge overlaps left bound
      expect(isRectVisible(840, 600, 50, 50, bounds)).toBe(true); // Top-left corner overlaps
    });

    it('should return false if rect is fully outside', () => {
      expect(isRectVisible(-150, 300, 50, 50, bounds)).toBe(false); // Too far left
      expect(isRectVisible(860, 660, 50, 50, bounds)).toBe(false); // Too far bottom-right
    });
  });

  describe('calculateCullingStats', () => {
    it('should calculate correct stats', () => {
      const stats = calculateCullingStats(100, 60);
      expect(stats.totalObjects).toBe(100);
      expect(stats.renderedObjects).toBe(60);
      expect(stats.culledObjects).toBe(40);
      expect(stats.cullingRatio).toBe(0.4);
    });

    it('should handle zero objects gracefully', () => {
      const stats = calculateCullingStats(0, 0);
      expect(stats.totalObjects).toBe(0);
      expect(stats.renderedObjects).toBe(0);
      expect(stats.culledObjects).toBe(0);
      expect(stats.cullingRatio).toBe(0);
    });
  });
});
