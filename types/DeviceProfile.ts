/**
 * Device Performance Profile Types
 *
 * Defines device capability profiles and performance configuration
 * for adaptive rendering optimization.
 */

// =============================================================================
// DEVICE PROFILE
// =============================================================================

export enum DeviceProfile {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  ULTRA = 'ULTRA',
}

// =============================================================================
// PERFORMANCE CONFIG
// =============================================================================

export interface PerformanceConfig {
  /** Profile name for display */
  profile: DeviceProfile;

  /** Number of background candles (30-150) */
  candleCount: number;

  /** Enable shadow effects (GPU intensive) */
  shadowsEnabled: boolean;

  /** Enable glow effects */
  glowEnabled: boolean;

  /** Particle count multiplier (0.3-1.5) */
  particleMultiplier: number;

  /** Maximum enemies on screen */
  maxEnemies: number;

  /** Use gradient background vs solid color */
  gradientBackground: boolean;

  /** Target frame rate */
  targetFPS: 30 | 60;
}

// =============================================================================
// BENCHMARK RESULT
// =============================================================================

export interface BenchmarkResult {
  /** GPU rendering score (higher = better) */
  gpuScore: number;

  /** CPU computation score (higher = better) */
  cpuScore: number;

  /** Combined weighted score */
  combinedScore: number;

  /** Detected device profile */
  profile: DeviceProfile;

  /** Device memory in GB (if available) */
  deviceMemory: number | null;

  /** CPU core count */
  hardwareConcurrency: number;

  /** WebGL renderer string */
  gpuRenderer: string | null;

  /** Benchmark timestamp */
  timestamp: number;

  /** Benchmark version (for cache invalidation) */
  version: string;
}

// =============================================================================
// BENCHMARK STATUS
// =============================================================================

export enum BenchmarkStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  CACHED = 'CACHED',
  ERROR = 'ERROR',
}

export interface BenchmarkState {
  status: BenchmarkStatus;
  progress: number; // 0-100
  currentTest: string;
  result: BenchmarkResult | null;
  error: string | null;
}
