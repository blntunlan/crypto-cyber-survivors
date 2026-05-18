/**
 * AntiCheatService - Client-Side Security & Integrity
 *
 * Provides multiple layers of protection against common cheating methods:
 * - DevTools detection
 * - Debugger detection
 * - Memory tampering detection
 * - Speed hack detection
 * - Console manipulation prevention
 *
 * @example
 * // Initialize at app startup
 * AntiCheatService.init();
 *
 * // Listen for cheat events
 * EventBus.on('cheatDetected', (data) => {
 *   console.warn('Cheat detected:', data.type);
 * });
 */

import { EventBus } from '../core/EventBus';
import { Logger } from './Logger';
import { type CheatType } from '../../types/events';
import { railwayClient } from '../api/RailwayClient';
import { RuntimeDiagnosticsService } from './RuntimeDiagnosticsService';

// =============================================================================
// TYPES
// =============================================================================

interface CriticalValue {
  value: unknown;
  checksum: number;
  lastUpdated: number;
}

interface AntiCheatConfig {
  /** Enable DevTools detection */
  detectDevTools: boolean;
  /** Enable debugger detection */
  detectDebugger: boolean;
  /** Enable memory integrity checks */
  enableIntegrityChecks: boolean;
  /** Enable speed hack detection */
  detectSpeedHack: boolean;
  /** Report cheats to server */
  reportToServer: boolean;
  /** Debug mode (logs more, doesn't report) */
  debugMode: boolean;
}

const DEFAULT_ANTI_CHEAT_CONFIG: AntiCheatConfig = {
  detectDevTools: true,
  detectDebugger: true,
  enableIntegrityChecks: true,
  detectSpeedHack: import.meta.env.VITE_ANTI_CHEAT_SPEED_HACK_ENABLED === 'true',
  reportToServer: true,
  debugMode: import.meta.env.DEV,
};

// =============================================================================
// ANTI-CHEAT SERVICE
// =============================================================================

class AntiCheatServiceClass {
  private static instance: AntiCheatServiceClass | null = null;

  // Configuration
  private config: AntiCheatConfig = { ...DEFAULT_ANTI_CHEAT_CONFIG };

  // State
  private initialized = false;
  private fingerprint: string = '';
  private criticalValues: Map<string, CriticalValue> = new Map();
  private warningCounts: Map<CheatType, number> = new Map();
  private lastWarningAtByType: Map<CheatType, number> = new Map();
  private escalatedWarnings: Set<CheatType> = new Set();
  private speedHackSamples: number[] = [];
  private speedHackSortedSamples: number[] = [];
  private speedHackSampleCount = 0;
  private speedHackSampleWriteIndex = 0;
  private speedHackSampleTotal = 0;
  private speedHackSamplesSinceAnalysis = 0;
  private speedHackBaselineMs = 0;

  // Intervals
  private devToolsInterval: ReturnType<typeof setInterval> | null = null;
  private debuggerInterval: ReturnType<typeof setInterval> | null = null;
  private integrityInterval: ReturnType<typeof setInterval> | null = null;
  private speedHackAnimationFrameId: number | null = null;
  private speedHackDetectionActive = false;
  private devToolsResizeHandler: (() => void) | null = null;
  private contextMenuHandler: ((event: MouseEvent) => void) | null = null;

  // Thresholds
  private readonly DEVTOOLS_THRESHOLD = 160; // px difference
  private readonly DEBUGGER_PAUSE_THRESHOLD = 100; // ms
  private readonly SPEED_HACK_TOLERANCE = 0.35; // 35% faster than local baseline
  private readonly SPEED_HACK_BASELINE_PERCENTILE = 0.2;
  private readonly SPEED_HACK_BASELINE_SAMPLE_COUNT = 60;
  private readonly SPEED_HACK_SAMPLE_WINDOW = 90;
  private readonly SPEED_HACK_ANALYSIS_INTERVAL_SAMPLES = 15;
  private readonly SPEED_HACK_MAX_REASONABLE_DELTA_MS = 250;
  private readonly SPEED_HACK_MIN_BASELINE_MS = 4;
  private readonly WARNING_COOLDOWN_MS = 10000;
  private readonly MAX_WARNINGS = 3;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AntiCheatServiceClass {
    return (AntiCheatServiceClass.instance ??= new AntiCheatServiceClass());
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Initialize anti-cheat protections
   */
  init(config?: Partial<AntiCheatConfig>): void {
    if (this.initialized) {
      Logger.warn('[AntiCheat] Already initialized');
      return;
    }

    // Merge config
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Generate fingerprint
    this.fingerprint = this.generateFingerprint();

    // Setup protections
    if (this.config.detectDevTools) {
      this.setupDevToolsDetection();
    }

    if (this.config.detectDebugger && !this.config.debugMode) {
      this.setupDebuggerDetection();
    }

    if (this.config.enableIntegrityChecks) {
      this.setupIntegrityChecks();
    }

    if (this.config.detectSpeedHack) {
      this.setupSpeedHackDetection();
    }

    // Disable right-click in production
    if (!this.config.debugMode) {
      this.disableContextMenu();
    }

    this.initialized = true;
    Logger.info('[AntiCheat] Initialized', {
      debugMode: this.config.debugMode,
      fingerprint: this.fingerprint.substring(0, 8) + '...',
    });
  }

  /**
   * Register a critical value to monitor for tampering
   */
  registerCriticalValue(key: string, value: unknown): void {
    this.criticalValues.set(key, {
      value,
      checksum: this.computeChecksum(value),
      lastUpdated: Date.now(),
    });
  }

  /**
   * Update a critical value (legitimate change)
   */
  updateCriticalValue(key: string, value: unknown): void {
    if (this.criticalValues.has(key)) {
      this.criticalValues.set(key, {
        value,
        checksum: this.computeChecksum(value),
        lastUpdated: Date.now(),
      });
    }
  }

  /**
   * Get device fingerprint
   */
  getFingerprint(): string {
    return this.fingerprint;
  }

  /**
   * Report an indicator discrepancy (e.g. RSI mismatch with server)
   */
  reportDiscrepancy(type: string, details: string, severity: number = 3): void {
    this.onCheatWarning('INDICATOR_DESYNC', `${type}: ${details}`);

    // If severity is high, escalate directly
    if (severity > 5) {
      this.onCheatDetected('INDICATOR_DESYNC', details, severity);
    }
  }

  /**
   * Cleanup and stop all detections
   */
  destroy(): void {
    if (this.devToolsInterval) clearInterval(this.devToolsInterval);
    if (this.debuggerInterval) clearInterval(this.debuggerInterval);
    if (this.integrityInterval) clearInterval(this.integrityInterval);
    if (this.speedHackAnimationFrameId !== null) {
      cancelAnimationFrame(this.speedHackAnimationFrameId);
    }

    if (this.devToolsResizeHandler) {
      window.removeEventListener('resize', this.devToolsResizeHandler);
    }

    if (this.contextMenuHandler) {
      document.removeEventListener('contextmenu', this.contextMenuHandler);
    }

    this.devToolsInterval = null;
    this.debuggerInterval = null;
    this.integrityInterval = null;
    this.speedHackAnimationFrameId = null;
    this.speedHackDetectionActive = false;
    this.resetSpeedHackSamples();
    this.speedHackBaselineMs = 0;
    this.devToolsResizeHandler = null;
    this.contextMenuHandler = null;
    this.initialized = false;
    Logger.info('[AntiCheat] Destroyed');
  }

  /**
   * Reset for testing
   */
  static resetForTesting(): void {
    if (this.instance) {
      this.instance.destroy();
      this.instance.config = { ...DEFAULT_ANTI_CHEAT_CONFIG };
      this.instance.fingerprint = '';
      this.instance.criticalValues.clear();
      this.instance.warningCounts.clear();
      this.instance.lastWarningAtByType.clear();
      this.instance.escalatedWarnings.clear();
      this.instance.resetSpeedHackSamples();
      this.instance.speedHackBaselineMs = 0;
    }
  }

  // ===========================================================================
  // DETECTION METHODS
  // ===========================================================================

  /**
   * DevTools detection via window size difference
   */
  private setupDevToolsDetection(): void {
    const check = (): void => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      if (widthDiff > this.DEVTOOLS_THRESHOLD || heightDiff > this.DEVTOOLS_THRESHOLD) {
        this.onCheatWarning('DEVTOOLS_OPEN', 'Developer tools may be open');
      }
    };

    // Check on resize and periodically
    this.devToolsResizeHandler = check;
    window.addEventListener('resize', this.devToolsResizeHandler);
    this.devToolsInterval = setInterval(check, 1000);
  }

  /**
   * Debugger detection via timing attack
   * Note: This is disabled in debug mode
   */
  private setupDebuggerDetection(): void {
    const check = (): void => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger; // This line will pause if debugger is open
      const elapsed = performance.now() - start;

      if (elapsed > this.DEBUGGER_PAUSE_THRESHOLD) {
        this.onCheatDetected('DEBUGGER_DETECTED', 'Debugger pause detected', 8);
      }
    };

    // Check periodically (not too often to avoid false positives)
    this.debuggerInterval = setInterval(check, 5000);
  }

  /**
   * Memory integrity checks for critical values
   */
  private setupIntegrityChecks(): void {
    this.integrityInterval = setInterval(() => {
      for (const [key, stored] of this.criticalValues) {
        const currentChecksum = this.computeChecksum(stored.value);

        if (currentChecksum !== stored.checksum) {
          // Value was modified externally!
          EventBus.emit('integrityCheckFailed', {
            target: key,
            expected: String(stored.checksum),
            actual: String(currentChecksum),
            timestamp: Date.now(),
          });

          this.onCheatDetected(
            'MEMORY_TAMPER',
            `Critical value "${key}" was tampered`,
            10
          );
        }
      }
    }, 100);
  }

  /**
   * Speed hack detection via frame timing
   */
  private setupSpeedHackDetection(): void {
    let lastTime = performance.now();
    this.speedHackDetectionActive = true;

    const frameCallback = (): void => {
      if (!this.speedHackDetectionActive) {
        return;
      }

      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      if (
        (typeof document !== 'undefined' && document.hidden) ||
        delta <= 0 ||
        delta > this.SPEED_HACK_MAX_REASONABLE_DELTA_MS
      ) {
        this.speedHackAnimationFrameId = requestAnimationFrame(frameCallback);
        return;
      }

      this.recordSpeedHackSample(delta);

      if (
        this.speedHackBaselineMs === 0 &&
        this.speedHackSampleCount >= this.SPEED_HACK_BASELINE_SAMPLE_COUNT
      ) {
        this.speedHackBaselineMs = Math.max(
          this.SPEED_HACK_MIN_BASELINE_MS,
          this.calculateSpeedHackPercentile(this.SPEED_HACK_BASELINE_PERCENTILE)
        );
        this.speedHackSamplesSinceAnalysis = 0;
      }

      if (this.speedHackBaselineMs > 0) {
        const avgDelta = this.calculateSpeedHackAverage();
        if (
          this.speedHackSamplesSinceAnalysis >=
          this.SPEED_HACK_ANALYSIS_INTERVAL_SAMPLES
        ) {
          const rollingBaseline = Math.max(
            this.SPEED_HACK_MIN_BASELINE_MS,
            this.calculateSpeedHackPercentile(this.SPEED_HACK_BASELINE_PERCENTILE)
          );
          if (
            rollingBaseline < this.speedHackBaselineMs &&
            rollingBaseline >=
              this.speedHackBaselineMs * (1 - this.SPEED_HACK_TOLERANCE)
          ) {
            this.speedHackBaselineMs = rollingBaseline;
          }
          this.speedHackSamplesSinceAnalysis = 0;
        }

        // RAF cadence is not hard proof of cheating; treat it as telemetry only.
        if (avgDelta < this.speedHackBaselineMs * (1 - this.SPEED_HACK_TOLERANCE)) {
          this.onCheatWarning(
            'SPEED_HACK',
            `Abnormal game speed detected (${avgDelta.toFixed(2)}ms avg)`,
            { cooldownMs: this.WARNING_COOLDOWN_MS, escalate: false }
          );
        }
      }

      this.speedHackAnimationFrameId = requestAnimationFrame(frameCallback);
    };

    this.speedHackAnimationFrameId = requestAnimationFrame(frameCallback);
  }

  /**
   * Disable right-click context menu
   */
  private disableContextMenu(): void {
    this.contextMenuHandler = event => {
      event.preventDefault();
      this.onCheatWarning('CONSOLE_MANIPULATION', 'Context menu access attempted');
    };
    document.addEventListener('contextmenu', this.contextMenuHandler);
  }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  /**
   * Handle soft detection (warning)
   */
  private onCheatWarning(
    type: CheatType,
    message: string,
    options: { cooldownMs?: number; escalate?: boolean } = {}
  ): void {
    if (this.escalatedWarnings.has(type)) {
      RuntimeDiagnosticsService.recordDebugSignal({
        source: 'AntiCheatService',
        code: 'ANTI_CHEAT_WARNING',
        message,
        count: this.warningCounts.get(type) ?? this.MAX_WARNINGS,
        metadata: {
          type,
          suppressedAfterDetection: true,
        },
      });
      return;
    }

    const now = Date.now();
    if (options.cooldownMs) {
      const lastWarningAt = this.lastWarningAtByType.get(type);
      if (lastWarningAt !== undefined && now - lastWarningAt < options.cooldownMs) {
        return;
      }
      this.lastWarningAtByType.set(type, now);
    }

    const count = (this.warningCounts.get(type) ?? 0) + 1;
    this.warningCounts.set(type, count);

    Logger.warn(
      `[AntiCheat] Warning (${count}/${this.MAX_WARNINGS}): ${type} - ${message}`
    );

    EventBus.emit('cheatWarning', {
      type,
      message,
      warningCount: count,
    });

    RuntimeDiagnosticsService.recordDebugSignal({
      source: 'AntiCheatService',
      code: 'ANTI_CHEAT_WARNING',
      message,
      count,
      metadata: {
        type,
      },
    });

    // Escalate to detection if too many warnings
    if (
      (options.escalate ?? true) &&
      count >= this.MAX_WARNINGS &&
      !this.escalatedWarnings.has(type)
    ) {
      this.escalatedWarnings.add(type);
      this.onCheatDetected(type, message, 5);
    }
  }

  /**
   * Handle hard detection (confirmed cheat)
   */
  private onCheatDetected(type: CheatType, details: string, severity: number): void {
    Logger.error(`[AntiCheat] CHEAT DETECTED: ${type} - ${details}`);

    RuntimeDiagnosticsService.recordDebugSignal({
      source: 'AntiCheatService',
      code: 'ANTI_CHEAT_DETECTED',
      message: details,
      count: severity,
      metadata: {
        type,
        severity,
      },
    });

    const eventData = {
      type,
      timestamp: Date.now(),
      details,
      fingerprint: this.fingerprint,
      severity,
    };

    EventBus.emit('cheatDetected', eventData);

    // Report to server
    if (this.config.reportToServer && !this.config.debugMode) {
      void this.reportCheat(eventData);
    }
  }

  /**
   * Report cheat to server
   */
  private async reportCheat(data: {
    type: CheatType;
    timestamp: number;
    details?: string;
    fingerprint?: string;
    severity: number;
  }): Promise<void> {
    try {
      await railwayClient.post('/api/v1/telemetry/cheat-reports', {
        cheatType: data.type,
        details: {
          message: data.details,
          fingerprint: data.fingerprint,
          timestamp: new Date(data.timestamp).toISOString(),
        },
        severity: String(data.severity),
      });

      Logger.debug('[AntiCheat] Cheat report sent successfully');
    } catch (error) {
      Logger.error('[AntiCheat] Failed to report cheat:', error);
    }
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Generate a device fingerprint
   */
  private generateFingerprint(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.maxTouchPoints || 0,
    ];

    // Simple hash
    const str = components.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(36) + Date.now().toString(36);
  }

  /**
   * Compute checksum for a value
   */
  private computeChecksum(value: unknown): number {
    const str = JSON.stringify(value);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }

  private recordSpeedHackSample(deltaMs: number): void {
    const writeIndex =
      this.speedHackSampleCount < this.SPEED_HACK_SAMPLE_WINDOW
        ? this.speedHackSampleCount
        : this.speedHackSampleWriteIndex;

    if (this.speedHackSampleCount >= this.SPEED_HACK_SAMPLE_WINDOW) {
      this.speedHackSampleTotal -= this.speedHackSamples[writeIndex] ?? 0;
    } else {
      this.speedHackSampleCount += 1;
    }

    this.speedHackSamples[writeIndex] = deltaMs;
    this.speedHackSampleTotal += deltaMs;
    this.speedHackSamplesSinceAnalysis += 1;

    if (this.speedHackSampleCount >= this.SPEED_HACK_SAMPLE_WINDOW) {
      this.speedHackSampleWriteIndex = (writeIndex + 1) % this.SPEED_HACK_SAMPLE_WINDOW;
    }
  }

  private resetSpeedHackSamples(): void {
    this.speedHackSamples.length = 0;
    this.speedHackSortedSamples.length = 0;
    this.speedHackSampleCount = 0;
    this.speedHackSampleWriteIndex = 0;
    this.speedHackSampleTotal = 0;
    this.speedHackSamplesSinceAnalysis = 0;
  }

  private calculateSpeedHackAverage(): number {
    if (this.speedHackSampleCount === 0) {
      return 0;
    }

    return this.speedHackSampleTotal / this.speedHackSampleCount;
  }

  private calculateSpeedHackPercentile(percentile: number): number {
    if (this.speedHackSampleCount === 0) {
      return 0;
    }

    for (let i = 0; i < this.speedHackSampleCount; i += 1) {
      this.speedHackSortedSamples[i] = this.speedHackSamples[i] ?? 0;
    }
    this.speedHackSortedSamples.length = this.speedHackSampleCount;
    this.speedHackSortedSamples.sort((a, b) => a - b);

    const index = Math.min(
      this.speedHackSortedSamples.length - 1,
      Math.max(0, Math.ceil(this.speedHackSortedSamples.length * percentile) - 1)
    );
    return this.speedHackSortedSamples[index] ?? 0;
  }
}

// Export singleton
export const AntiCheatService = AntiCheatServiceClass.getInstance();
