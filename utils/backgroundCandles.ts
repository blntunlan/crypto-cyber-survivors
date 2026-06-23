/**
 * Background Candle Generator
 *
 * Creates background candles based on performance config.
 * Uses casino color palette and layered depth system.
 */

import { type Candle } from '../types';
import { COLORS } from '../constants';
import { type PerformanceConfig } from '../types/DeviceProfile';

// Casino candle colors - Green (bullish) and Red (bearish) only
// Multiple shades for depth variation
const CANDLE_GREENS = [
  COLORS.PUMP_GREEN, // #00E676 - Bright pump green
  COLORS.CASINO_GREEN, // #05732c - Deep roulette green
  COLORS.NEON_GREEN, // #39FF14 - Electric neon green
];

const CANDLE_REDS = [
  COLORS.DUMP_ORANGE, // #FF3D00 - Dump orange-red
  COLORS.CASINO_RED, // #B22222 - Classic casino red
  COLORS.SHORT, // #ef4444 - Market short red
];

// Combined candle colors for random selection
const CANDLE_COLORS = [...CANDLE_GREENS, ...CANDLE_REDS];

/**
 * Generate background candles based on performance config.
 * Implements a slot-based distribution to prevent X-axis overlap.
 */
export function generateBackgroundCandles(
  width: number,
  height: number,
  config: PerformanceConfig
): Candle[] {
  const totalCandles = config.candleCount;
  const candles: Candle[] = [];

  // Define slots to prevent horizontal overlapping
  // We use more slots than candles to allow for some randomness
  const slotCount = Math.max(totalCandles, Math.floor(width / 12));
  const slotWidth = width / slotCount;
  const availableSlots = Array.from({ length: slotCount }, (_, i) => i);

  // Function to pick a random slot and remove it from available pool
  const pickSlot = () => {
    if (availableSlots.length === 0) return Math.random() * width;
    const index = Math.floor(Math.random() * availableSlots.length);
    const slotIndex = availableSlots.splice(index, 1)[0]!;
    // Add small random offset within the slot
    return slotIndex * slotWidth + Math.random() * (slotWidth * 0.5);
  };

  // Layers distribution stays the same
  const layer1Count = Math.floor(totalCandles * 0.35);
  const layer2Count = Math.floor(totalCandles * 0.4);
  const layer3Count = totalCandles - layer1Count - layer2Count;

  // Layer 1: Far background (smallest, slowest)
  for (let i = 0; i < layer1Count; i++) {
    candles.push({
      x: pickSlot(),
      y: Math.random() * height,
      w: 1 + Math.random() * 1.5,
      h: 15 + Math.random() * 20,
      color: CANDLE_COLORS[Math.floor(Math.random() * CANDLE_COLORS.length)]!,
      speed: 0.1 + Math.random() * 0.3,
      layer: 1,
      z: 0.2, // Deep background
    });
  }

  // Layer 2: Mid background
  for (let i = 0; i < layer2Count; i++) {
    candles.push({
      x: pickSlot(),
      y: Math.random() * height,
      w: 2 + Math.random() * 2,
      h: 25 + Math.random() * 40,
      color: CANDLE_COLORS[Math.floor(Math.random() * CANDLE_COLORS.length)]!,
      speed: 0.4 + Math.random() * 0.6,
      layer: 2,
      z: 0.5, // Middle ground
    });
  }

  // Layer 3: Near foreground (largest, fastest)
  for (let i = 0; i < layer3Count; i++) {
    candles.push({
      x: pickSlot(),
      y: Math.random() * height,
      w: 3 + Math.random() * 4,
      h: 40 + Math.random() * 60,
      color: CANDLE_COLORS[Math.floor(Math.random() * CANDLE_COLORS.length)]!,
      speed: 1.0 + Math.random() * 1.0,
      layer: 3,
      z: 0.9, // Near foreground
    });
  }

  return candles;
}

/**
 * Default candle generator for initial load (before benchmark)
 * Uses medium settings as default
 */
export function generateDefaultCandles(width: number, height: number): Candle[] {
  return generateBackgroundCandles(width, height, {
    profile: 'MEDIUM' as never,
    candleCount: 55,
    candleOpacity: 0.19,
    bgBrightnessFloor: 5,
    shadowsEnabled: false,
    glowEnabled: false,
    particleMultiplier: 1.0,
    maxEnemies: 60,
    gradientBackground: true,
    targetFPS: 60,
  });
}
