/**
 * Math utilities - Shared mathematical functions
 *
 * Provides common math operations used throughout the codebase.
 * Centralizes implementation to avoid duplication.
 */

/**
 * Linear interpolation between two values.
 *
 * @param start - Starting value
 * @param end - Ending value
 * @param t - Interpolation factor (0-1, where 0 = start, 1 = end)
 * @returns Interpolated value
 *
 * @example
 * lerp(0, 100, 0.5) // 50
 * lerp(10, 20, 0.25) // 12.5
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Clamps a value between a minimum and maximum.
 *
 * @param value - Value to clamp
 * @param min - Minimum bound
 * @param max - Maximum bound
 * @returns Clamped value
 *
 * @example
 * clamp(150, 0, 100) // 100
 * clamp(-5, 0, 100) // 0
 * clamp(50, 0, 100) // 50
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Maps a value from one range to another.
 *
 * @param value - Value to map
 * @param inMin - Input range minimum
 * @param inMax - Input range maximum
 * @param outMin - Output range minimum
 * @param outMax - Output range maximum
 * @returns Mapped value
 *
 * @example
 * mapRange(50, 0, 100, 0, 1) // 0.5
 * mapRange(0.5, 0, 1, 0, 255) // 127.5
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

/**
 * Rounds a number to a specified number of decimal places.
 *
 * @param value - Value to round
 * @param decimals - Number of decimal places
 * @returns Rounded value
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
