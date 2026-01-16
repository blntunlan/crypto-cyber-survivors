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

import { EventBus } from './EventBus';
import { Logger } from './Logger';
import { type CheatType } from '../types/events';
import { supabase } from './Supabase';

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

// =============================================================================
// ANTI-CHEAT SERVICE
// =============================================================================

class AntiCheatServiceClass {
  private static instance: AntiCheatServiceClass | null = null;

  // Configuration
  private config: AntiCheatConfig = {
    detectDevTools: true,
    detectDebugger: true,
    enableIntegrityChecks: true,
    detectSpeedHack: true,
    reportToServer: true,
    debugMode: import.meta.env.DEV,
  };

  // State
  private initialized = false;
  private fingerprint: string = '';
  private criticalValues: Map<string, CriticalValue> = new Map();
  private warningCounts: Map<CheatType, number> = new Map();
  private speedHackSamples: number[] = [];

  // Intervals
  private devToolsInterval: ReturnType<typeof setInterval> | null = null;
  private debuggerInterval: ReturnType<typeof setInterval> | null = null;
  private integrityInterval: ReturnType<typeof setInterval> | null = null;
  private speedHackInterval: ReturnType<typeof setInterval> | null = null;

  // Thresholds
  private readonly DEVTOOLS_THRESHOLD = 160; // px difference
  private readonly DEBUGGER_PAUSE_THRESHOLD = 100; // ms
  private readonly SPEED_HACK_TOLERANCE = 0.15; // 15% deviation
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
   * Cleanup and stop all detections
   */
  destroy(): void {
    if (this.devToolsInterval) clearInterval(this.devToolsInterval);
    if (this.debuggerInterval) clearInterval(this.debuggerInterval);
    if (this.integrityInterval) clearInterval(this.integrityInterval);
    if (this.speedHackInterval) clearInterval(this.speedHackInterval);

    this.initialized = false;
    Logger.info('[AntiCheat] Destroyed');
  }

  /**
   * Reset for testing
   */
  static resetForTesting(): void {
    if (this.instance) {
      this.instance.destroy();
      this.instance.criticalValues.clear();
      this.instance.warningCounts.clear();
      this.instance.speedHackSamples = [];
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
    window.addEventListener('resize', check);
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

    const frameCallback = (): void => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      // Collect samples
      this.speedHackSamples.push(delta);
      if (this.speedHackSamples.length > 60) {
        this.speedHackSamples.shift();
      }

      // Analyze after collecting enough samples
      if (this.speedHackSamples.length >= 30) {
        const avgDelta =
          this.speedHackSamples.reduce((a, b) => a + b, 0) /
          this.speedHackSamples.length;
        const expectedDelta = 1000 / 60; // ~16.67ms for 60fps

        // Check if game is running too fast
        if (avgDelta < expectedDelta * (1 - this.SPEED_HACK_TOLERANCE)) {
          this.onCheatWarning(
            'SPEED_HACK',
            `Abnormal game speed detected (${avgDelta.toFixed(2)}ms avg)`
          );
        }
      }

      requestAnimationFrame(frameCallback);
    };

    requestAnimationFrame(frameCallback);
  }

  /**
   * Disable right-click context menu
   */
  private disableContextMenu(): void {
    document.addEventListener('contextmenu', e => {
      e.preventDefault();
      this.onCheatWarning('CONSOLE_MANIPULATION', 'Context menu access attempted');
    });
  }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  /**
   * Handle soft detection (warning)
   */
  private onCheatWarning(type: CheatType, message: string): void {
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

    // Escalate to detection if too many warnings
    if (count >= this.MAX_WARNINGS) {
      this.onCheatDetected(type, message, 5);
    }
  }

  /**
   * Handle hard detection (confirmed cheat)
   */
  private onCheatDetected(type: CheatType, details: string, severity: number): void {
    Logger.error(`[AntiCheat] CHEAT DETECTED: ${type} - ${details}`);

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
      if (!supabase) {
        Logger.warn('[AntiCheat] Supabase not initialized, cannot report cheat');
        return;
      }
      await supabase.from('cheat_attempts').insert({
        cheat_type: data.type,
        details: data.details,
        fingerprint: data.fingerprint,
        severity: data.severity,
        user_agent: navigator.userAgent,
        timestamp: new Date(data.timestamp).toISOString(),
      });
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
}

// Export singleton
export const AntiCheatService = AntiCheatServiceClass.getInstance();
