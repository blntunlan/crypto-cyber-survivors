/**
 * CullingUtils - Off-Screen Culling Utilities
 *
 * Provides efficient visibility checking for game objects.
 * Objects outside the visible viewport are not rendered,
 * improving performance significantly with large entity counts.
 */

/**
 * Bounds interface for rectangular viewport
 */
export interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Create viewport bounds with optional padding for offscreen margin
 * Objects within the padding area are still rendered to prevent pop-in
 */
export function createViewportBounds(
  width: number,
  height: number,
  padding: number = 50
): ViewportBounds {
  return {
    left: -padding,
    right: width + padding,
    top: -padding,
    bottom: height + padding,
  };
}

/**
 * Updates an existing viewport bounds object in-place to avoid GC allocations
 */
export function updateViewportBounds(
  bounds: ViewportBounds,
  width: number,
  height: number,
  padding: number = 50
): void {
  bounds.left = -padding;
  bounds.right = width + padding;
  bounds.top = -padding;
  bounds.bottom = height + padding;
}

/**
 * Check if a circular object is visible within the viewport
 * Uses AABB (Axis-Aligned Bounding Box) check for performance
 */
export function isCircleVisible(
  x: number,
  y: number,
  radius: number,
  bounds: ViewportBounds
): boolean {
  return (
    x + radius >= bounds.left &&
    x - radius <= bounds.right &&
    y + radius >= bounds.top &&
    y - radius <= bounds.bottom
  );
}

/**
 * Check if a point is visible within the viewport
 */
export function isPointVisible(x: number, y: number, bounds: ViewportBounds): boolean {
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

/**
 * Check if a rectangular object is visible within the viewport
 */
export function isRectVisible(
  x: number,
  y: number,
  rectWidth: number,
  rectHeight: number,
  bounds: ViewportBounds
): boolean {
  return (
    x + rectWidth >= bounds.left &&
    x <= bounds.right &&
    y + rectHeight >= bounds.top &&
    y <= bounds.bottom
  );
}

/**
 * Pre-computed culling stats for debugging/metrics
 */
export interface CullingStats {
  totalObjects: number;
  culledObjects: number;
  renderedObjects: number;
  cullingRatio: number;
}

/**
 * Calculate culling statistics
 */
export function calculateCullingStats(total: number, rendered: number): CullingStats {
  const culled = total - rendered;
  return {
    totalObjects: total,
    culledObjects: culled,
    renderedObjects: rendered,
    cullingRatio: total > 0 ? culled / total : 0,
  };
}
