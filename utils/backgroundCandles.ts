/**
 * Background Candle Generator
 *
 * Creates background candles based on performance config.
 * Uses casino color palette and layered depth system.
 */

import { type Candle } from '../types';
import { COLORS } from '../constants';
import { type PerformanceConfig } from '../types/DeviceProfile';

// Casino color palette
const CASINO_COLORS = [
  COLORS.CASINO_GOLD,
  COLORS.CASINO_RED,
  COLORS.CASINO_GREEN,
  COLORS.NEON_ORANGE,
  COLORS.NEON_GREEN,
  COLORS.ROYAL_PURPLE,
  COLORS.BRILLIANT_ROSE,
  COLORS.ELECTRIC_BLUE,
  COLORS.PUMP_GREEN,
  COLORS.DUMP_ORANGE,
  COLORS.JACKPOT_YELLOW,
];

/**
 * Generate background candles based on performance config
 */
export function generateBackgroundCandles(
  width: number,
  height: number,
  config: PerformanceConfig
): Candle[] {
  const totalCandles = config.candleCount;
  const candles: Candle[] = [];

  // Distribute candles across 3 layers
  // Layer 1 (far): 35% - smaller, slower
  // Layer 2 (mid): 40% - medium
  // Layer 3 (near): 25% - larger, faster, with glow
  const layer1Count = Math.floor(totalCandles * 0.35);
  const layer2Count = Math.floor(totalCandles * 0.4);
  const layer3Count = totalCandles - layer1Count - layer2Count;

  // Layer 1: Far background (smallest, slowest)
  for (let i = 0; i < layer1Count; i++) {
    candles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      w: 1 + Math.random() * 2,
      h: 15 + Math.random() * 30,
      color: CASINO_COLORS[Math.floor(Math.random() * CASINO_COLORS.length)]!,
      speed: 0.1 + Math.random() * 0.5,
    });
  }

  // Layer 2: Mid background
  for (let i = 0; i < layer2Count; i++) {
    candles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      w: 2 + Math.random() * 3,
      h: 25 + Math.random() * 50,
      color: CASINO_COLORS[Math.floor(Math.random() * CASINO_COLORS.length)]!,
      speed: 0.3 + Math.random() * 1.0,
    });
  }

  // Layer 3: Near foreground (largest, fastest)
  for (let i = 0; i < layer3Count; i++) {
    candles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      w: 3 + Math.random() * 5,
      h: 40 + Math.random() * 80,
      color: CASINO_COLORS[Math.floor(Math.random() * CASINO_COLORS.length)]!,
      speed: 0.5 + Math.random() * 1.5,
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
    candleCount: 70,
    shadowsEnabled: false,
    glowEnabled: false,
    particleMultiplier: 1.0,
    maxEnemies: 60,
    gradientBackground: true,
    targetFPS: 60,
  });
}
