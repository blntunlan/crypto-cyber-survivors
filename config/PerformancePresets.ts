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
    candleCount: 110,
    candleOpacity: 0.1,
    bgBrightnessFloor: 0,
    shadowsEnabled: true,
    glowEnabled: true,
    particleMultiplier: 1.5,
    maxEnemies: 150,
    gradientBackground: true,
    targetFPS: 60,
  },
  [DeviceProfile.HIGH]: {
    profile: DeviceProfile.HIGH,
    candleCount: 80,
    candleOpacity: 0.14,
    bgBrightnessFloor: 2,
    shadowsEnabled: true,
    glowEnabled: true,
    particleMultiplier: 1.0,
    maxEnemies: 120,
    gradientBackground: true,
    targetFPS: 60,
  },
  [DeviceProfile.MEDIUM]: {
    profile: DeviceProfile.MEDIUM,
    candleCount: 55,
    candleOpacity: 0.19,
    bgBrightnessFloor: 5,
    shadowsEnabled: false,
    glowEnabled: false,
    particleMultiplier: 0.7,
    maxEnemies: 90,
    gradientBackground: true,
    targetFPS: 60,
  },
  [DeviceProfile.LOW]: {
    profile: DeviceProfile.LOW,
    candleCount: 35,
    candleOpacity: 0.3,
    bgBrightnessFloor: 10,
    shadowsEnabled: false,
    glowEnabled: false,
    particleMultiplier: 0.3,
    maxEnemies: 60,
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
 * Detect baseline profile from hardware specs (GPU renderer, CPU cores, RAM).
 * Returns baseline (minimum profile) and maxPossible (cap profile) based on hardware.
 */
export function detectHardwareBaseline(
  gpuRenderer: string | null,
  hardwareConcurrency: number,
  deviceMemory: number | null
): { baseline: DeviceProfile | null; maxPossible: DeviceProfile | null } {
  if (!gpuRenderer) {
    // Basic CPU/RAM fallback baselines
    if (hardwareConcurrency >= 8 && deviceMemory && deviceMemory >= 8) {
      return { baseline: DeviceProfile.MEDIUM, maxPossible: null };
    }
    return { baseline: null, maxPossible: null };
  }

  const gpuLower = gpuRenderer.toLowerCase();

  // 1. Software Renderers / Known Ultra-low-end: Cap at LOW or MEDIUM
  if (
    gpuLower.includes('swiftshader') ||
    gpuLower.includes('llvmpipe') ||
    gpuLower.includes('software rasterizer') ||
    gpuLower.includes('basic render driver')
  ) {
    return { baseline: DeviceProfile.LOW, maxPossible: DeviceProfile.LOW };
  }

  // 2. Dedicated High-End Desktop / Laptop GPUs
  const isHighEndDesktopGPU =
    gpuLower.includes('rtx') ||
    gpuLower.includes('gtx') ||
    gpuLower.includes('radeon rx') ||
    (gpuLower.includes('nvidia') && !gpuLower.includes('tegra')) ||
    (gpuLower.includes('amd') && !gpuLower.includes('radeon(tm) graphics'));

  if (isHighEndDesktopGPU) {
    return { baseline: DeviceProfile.ULTRA, maxPossible: null };
  }

  // 3. Apple Devices (M-series or modern A-series)
  const isAppleSilicon = gpuLower.includes('apple');
  if (isAppleSilicon) {
    // Apple Silicon Macs/iPads (M1, M2, M3, M4)
    if (gpuLower.includes('apple m')) {
      return { baseline: DeviceProfile.ULTRA, maxPossible: null };
    }
    // Apple Phone/iPad A-series (e.g. A15, A16, A17, A18)
    // hardwareConcurrency >= 6 means modern A-series (iPhone 11 or newer)
    if (hardwareConcurrency >= 6) {
      return { baseline: DeviceProfile.HIGH, maxPossible: null };
    }
    // Older Apple GPU
    return { baseline: DeviceProfile.MEDIUM, maxPossible: null };
  }

  // 4. Qualcomm Snapdragon (Adreno) Mobile GPUs
  if (gpuLower.includes('adreno')) {
    // Adreno 7xx/8xx series are flagship (e.g. Adreno 730, 740, 750, 830)
    // Adreno 650/660 are older flagships, still very capable of HIGH
    if (
      gpuLower.includes('adreno (tm) 7') ||
      gpuLower.includes('adreno (tm) 8') ||
      gpuLower.includes('adreno (tm) 650') ||
      gpuLower.includes('adreno (tm) 660')
    ) {
      return { baseline: DeviceProfile.HIGH, maxPossible: null };
    }
    // Adreno 6xx series (except 650/660) are mid-range (e.g. 618, 619, 642, 610)
    if (gpuLower.includes('adreno (tm) 6')) {
      // Adreno 610/612/613 are low-end
      if (
        gpuLower.includes('610') ||
        gpuLower.includes('612') ||
        gpuLower.includes('613')
      ) {
        return { baseline: DeviceProfile.LOW, maxPossible: DeviceProfile.MEDIUM };
      }
      return { baseline: DeviceProfile.MEDIUM, maxPossible: null };
    }
    // Adreno 5xx series are low-end
    if (gpuLower.includes('adreno (tm) 5')) {
      return { baseline: DeviceProfile.LOW, maxPossible: DeviceProfile.LOW };
    }
  }

  // 5. ARM Mali / Immortalis Mobile GPUs
  if (gpuLower.includes('mali') || gpuLower.includes('immortalis')) {
    // Immortalis and high-end Mali G-series (Mali-G715, G720, G925, etc.)
    if (
      gpuLower.includes('immortalis') ||
      gpuLower.includes('g715') ||
      gpuLower.includes('g720') ||
      gpuLower.includes('g725') ||
      gpuLower.includes('g925')
    ) {
      return { baseline: DeviceProfile.HIGH, maxPossible: null };
    }
    // Mid-range Mali G-series (Mali-G68, G57, G76, G77, G78)
    if (
      gpuLower.includes('g68') ||
      gpuLower.includes('g57') ||
      gpuLower.includes('g76') ||
      gpuLower.includes('g77') ||
      gpuLower.includes('g78')
    ) {
      return { baseline: DeviceProfile.MEDIUM, maxPossible: null };
    }
    // Low-end Mali (Mali-G52, G31, T-series)
    if (
      gpuLower.includes('g52') ||
      gpuLower.includes('g31') ||
      gpuLower.includes('mali-t')
    ) {
      return { baseline: DeviceProfile.LOW, maxPossible: DeviceProfile.MEDIUM };
    }
  }

  // 6. Integrated Desktop GPUs (Intel HD/UHD/Iris, AMD Radeon Graphics)
  if (
    gpuLower.includes('intel(r) hd') ||
    gpuLower.includes('intel(r) uhd') ||
    gpuLower.includes('intel(r) iris') ||
    gpuLower.includes('intel(r) xe') ||
    gpuLower.includes('radeon(tm) graphics')
  ) {
    return { baseline: DeviceProfile.MEDIUM, maxPossible: null };
  }

  // Fallback: If hardware concurrency or memory is high, assume at least MEDIUM
  if (hardwareConcurrency >= 8 || (deviceMemory && deviceMemory >= 6)) {
    return { baseline: DeviceProfile.MEDIUM, maxPossible: null };
  }

  return { baseline: null, maxPossible: null };
}

/**
 * Determine profile from combined benchmark score and hardware specs
 */
export function getProfileFromScore(
  combinedScore: number,
  gpuRenderer: string | null = null,
  hardwareConcurrency: number = 4,
  deviceMemory: number | null = null
): DeviceProfile {
  // 1. Get raw profile from the benchmark score
  let scoreProfile = DeviceProfile.LOW;
  if (combinedScore >= PROFILE_THRESHOLDS.ULTRA) {
    scoreProfile = DeviceProfile.ULTRA;
  } else if (combinedScore >= PROFILE_THRESHOLDS.HIGH) {
    scoreProfile = DeviceProfile.HIGH;
  } else if (combinedScore >= PROFILE_THRESHOLDS.MEDIUM) {
    scoreProfile = DeviceProfile.MEDIUM;
  }

  // 2. Adjust using hardware characteristics
  const { baseline, maxPossible } = detectHardwareBaseline(
    gpuRenderer,
    hardwareConcurrency,
    deviceMemory
  );

  let finalProfile = scoreProfile;

  // Apply baseline minimum if the hardware is known to be capable
  if (baseline !== null) {
    const profileOrder = [
      DeviceProfile.LOW,
      DeviceProfile.MEDIUM,
      DeviceProfile.HIGH,
      DeviceProfile.ULTRA,
    ];
    const scoreIdx = profileOrder.indexOf(scoreProfile);
    const baselineIdx = profileOrder.indexOf(baseline);

    if (baselineIdx > scoreIdx) {
      finalProfile = baseline;
    }
  }

  // Apply maximum cap if the hardware is known to be low-end/legacy
  if (maxPossible !== null) {
    const profileOrder = [
      DeviceProfile.LOW,
      DeviceProfile.MEDIUM,
      DeviceProfile.HIGH,
      DeviceProfile.ULTRA,
    ];
    const finalIdx = profileOrder.indexOf(finalProfile);
    const maxIdx = profileOrder.indexOf(maxPossible);

    if (finalIdx > maxIdx) {
      finalProfile = maxPossible;
    }
  }

  return finalProfile;
}

/**
 * Calculate combined score from GPU and CPU scores
 */
export function calculateCombinedScore(gpuScore: number, cpuScore: number): number {
  // GPU weighted at 70%, CPU at 30% (rendering is more important)
  return Math.round(gpuScore * 0.7 + cpuScore * 0.3);
}
