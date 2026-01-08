/**
 * Performance Presets Configuration
 *
 * Defines preset configurations for each device profile.
 * These are applied based on benchmark results.
 */

import { DeviceProfile, type PerformanceConfig } from '../types/DeviceProfile';

// =============================================================================
// PERFORMANCE PRESETS
// =============================================================================

export const PERFORMANCE_PRESETS: Record<DeviceProfile, PerformanceConfig> = {
  [DeviceProfile.ULTRA]: {
    profile: DeviceProfile.ULTRA,
    candleCount: 150,
    shadowsEnabled: true,
    glowEnabled: true,
    particleMultiplier: 1.5,
    maxEnemies: 150,
    gradientBackground: true,
    targetFPS: 60,
  },
  [DeviceProfile.HIGH]: {
    profile: DeviceProfile.HIGH,
    candleCount: 120,
    shadowsEnabled: true,
    glowEnabled: true,
    particleMultiplier: 1.0,
    maxEnemies: 150,
    gradientBackground: true,
    targetFPS: 60,
  },
  [DeviceProfile.MEDIUM]: {
    profile: DeviceProfile.MEDIUM,
    candleCount: 70,
    shadowsEnabled: false,
    glowEnabled: false,
    particleMultiplier: 0.7,
    maxEnemies: 150,
    gradientBackground: true,
    targetFPS: 60,
  },
  [DeviceProfile.LOW]: {
    profile: DeviceProfile.LOW,
    candleCount: 30,
    shadowsEnabled: false,
    glowEnabled: false,
    particleMultiplier: 0.3,
    maxEnemies: 150,
    gradientBackground: false,
    targetFPS: 30,
  },
};

// =============================================================================
// SCORE THRESHOLDS
// =============================================================================

/**
 * Score thresholds for profile determination.
 * Combined score = (GPU * 0.7) + (CPU * 0.3)
 */
export const PROFILE_THRESHOLDS = {
  ULTRA: 800, // >= 800 = ULTRA
  HIGH: 500, // >= 500 = HIGH
  MEDIUM: 200, // >= 200 = MEDIUM
  // < 200 = LOW
};

// =============================================================================
// BENCHMARK CONFIG
// =============================================================================

export const BENCHMARK_CONFIG = {
  /** Current benchmark version - change to invalidate cache */
  VERSION: '1.0.0',

  /** localStorage key for cached results */
  CACHE_KEY: 'ccs_benchmark_result',

  /** Cache validity duration (7 days) */
  CACHE_DURATION_MS: 7 * 24 * 60 * 60 * 1000,

  /** GPU test iterations */
  GPU_TEST_ITERATIONS: 500,

  /** CPU test iterations */
  CPU_TEST_ITERATIONS: 500000,

  /** Benchmark timeout (ms) */
  TIMEOUT_MS: 5000,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get performance config for a given profile
 */
export function getPerformanceConfig(profile: DeviceProfile): PerformanceConfig {
  return PERFORMANCE_PRESETS[profile];
}

/**
 * Determine profile from combined benchmark score
 */
export function getProfileFromScore(combinedScore: number): DeviceProfile {
  if (combinedScore >= PROFILE_THRESHOLDS.ULTRA) return DeviceProfile.ULTRA;
  if (combinedScore >= PROFILE_THRESHOLDS.HIGH) return DeviceProfile.HIGH;
  if (combinedScore >= PROFILE_THRESHOLDS.MEDIUM) return DeviceProfile.MEDIUM;
  return DeviceProfile.LOW;
}

/**
 * Calculate combined score from GPU and CPU scores
 */
export function calculateCombinedScore(gpuScore: number, cpuScore: number): number {
  // GPU weighted at 70%, CPU at 30% (rendering is more important)
  return Math.round(gpuScore * 0.7 + cpuScore * 0.3);
}
