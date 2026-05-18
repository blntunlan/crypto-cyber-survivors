import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AntiCheatService } from '../../services/system/AntiCheatService';
import { EventBus } from '../../services/core/EventBus';

// Mock RailwayClient
const mockPost = vi.fn().mockResolvedValue({ accepted: true });
vi.mock('../../services/api/RailwayClient', () => ({
  railwayClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe('AntiCheatService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // @ts-expect-error:  access static method via constructor
    AntiCheatService.constructor.resetForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      AntiCheatService.init({ debugMode: true });
      // @ts-expect-error: testing
      expect(AntiCheatService.initialized).toBe(true);
      expect(AntiCheatService.getFingerprint()).toBeDefined();
    });

    it('should not initialize twice', () => {
      const spy = vi.spyOn(console, 'warn');
      AntiCheatService.init();
      AntiCheatService.init();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Already initialized'));
    });

    it('should remove browser listeners on destroy', () => {
      const windowRemoveSpy = vi.spyOn(window, 'removeEventListener');
      const documentRemoveSpy = vi.spyOn(document, 'removeEventListener');

      AntiCheatService.init({
        detectDevTools: true,
        detectDebugger: false,
        detectSpeedHack: false,
        enableIntegrityChecks: false,
        reportToServer: false,
        debugMode: false,
      });

      AntiCheatService.destroy();

      expect(windowRemoveSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(documentRemoveSpy).toHaveBeenCalledWith(
        'contextmenu',
        expect.any(Function)
      );
    });

    it('should cancel and stop speed hack detection on destroy', () => {
      let frameCallback: FrameRequestCallback | null = null;
      const requestSpy = vi
        .spyOn(globalThis, 'requestAnimationFrame')
        .mockImplementation(callback => {
          frameCallback = callback;
          return 123;
        });
      const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');

      AntiCheatService.init({
        detectDevTools: false,
        detectDebugger: false,
        detectSpeedHack: true,
        enableIntegrityChecks: false,
        debugMode: true,
      });

      AntiCheatService.destroy();
      frameCallback?.(performance.now());

      expect(cancelSpy).toHaveBeenCalledWith(123);
      expect(requestSpy).toHaveBeenCalledTimes(1);
    });

    it('should not start RAF speed detection by default', () => {
      const requestSpy = vi.spyOn(globalThis, 'requestAnimationFrame');

      AntiCheatService.init({
        detectDevTools: false,
        detectDebugger: false,
        enableIntegrityChecks: false,
        reportToServer: false,
        debugMode: true,
      });

      expect(requestSpy).not.toHaveBeenCalled();
    });
  });

  describe('Memory Integrity Checks', () => {
    it('should detect value tampering', () => {
      const cheatSpy = vi.fn();
      EventBus.on('cheatDetected', cheatSpy);

      AntiCheatService.init({
        enableIntegrityChecks: true,
        debugMode: true, // Don't report to supabase in tests
      });

      const key = 'playerGold';
      const value = 100;

      // Register value
      AntiCheatService.registerCriticalValue(key, value);

      // Tamper with the internal map (simulating external memory modification)
      // @ts-expect-error:  access private map
      const stored = AntiCheatService.criticalValues.get(key);
      if (stored) {
        stored.value = 999999; // Modified without calling updateCriticalValue
      }

      // Fast forward to integrity check interval (100ms)
      vi.advanceTimersByTime(200);

      expect(cheatSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MEMORY_TAMPER',
        })
      );
    });

    it('should allow legitimate updates via updateCriticalValue', () => {
      const cheatSpy = vi.fn();
      EventBus.on('cheatDetected', cheatSpy);

      AntiCheatService.init({ enableIntegrityChecks: true, debugMode: true });

      AntiCheatService.registerCriticalValue('score', 10);
      AntiCheatService.updateCriticalValue('score', 20);

      vi.advanceTimersByTime(200);
      expect(cheatSpy).not.toHaveBeenCalled();
    });
  });

  describe('Warning Escalation', () => {
    it('should escalate warnings to hard detection after 3 attempts', () => {
      const warningSpy = vi.fn();
      const detectionSpy = vi.fn();
      EventBus.on('cheatWarning', warningSpy);
      EventBus.on('cheatDetected', detectionSpy);

      AntiCheatService.init({ debugMode: true });

      // Trigger context menu warning 3 times
      // @ts-expect-error:  trigger private handler
      AntiCheatService.onCheatWarning('CONSOLE_MANIPULATION', 'test');
      // @ts-expect-error: testing
      AntiCheatService.onCheatWarning('CONSOLE_MANIPULATION', 'test');
      // @ts-expect-error: testing
      AntiCheatService.onCheatWarning('CONSOLE_MANIPULATION', 'test');

      expect(warningSpy).toHaveBeenCalledTimes(3);
      expect(detectionSpy).toHaveBeenCalledTimes(1);
      expect(detectionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CONSOLE_MANIPULATION',
        })
      );
    });

    it('should only escalate a repeated warning type once', () => {
      const detectionSpy = vi.fn();
      EventBus.on('cheatDetected', detectionSpy);

      AntiCheatService.init({ debugMode: true });

      // @ts-expect-error: testing
      AntiCheatService.onCheatWarning('CONSOLE_MANIPULATION', 'test');
      // @ts-expect-error: testing
      AntiCheatService.onCheatWarning('CONSOLE_MANIPULATION', 'test');
      // @ts-expect-error: testing
      AntiCheatService.onCheatWarning('CONSOLE_MANIPULATION', 'test');
      // @ts-expect-error: testing
      AntiCheatService.onCheatWarning('CONSOLE_MANIPULATION', 'test');
      // @ts-expect-error: testing
      AntiCheatService.onCheatWarning('CONSOLE_MANIPULATION', 'test');

      expect(detectionSpy).toHaveBeenCalledTimes(1);
    });

    it('should keep speed timing anomalies as telemetry warnings', () => {
      const warningSpy = vi.fn();
      const detectionSpy = vi.fn();
      EventBus.on('cheatWarning', warningSpy);
      EventBus.on('cheatDetected', detectionSpy);

      AntiCheatService.init({ debugMode: true });

      // @ts-expect-error: testing telemetry-only warning mode
      AntiCheatService.onCheatWarning('SPEED_HACK', 'timing anomaly', {
        escalate: false,
      });
      // @ts-expect-error: testing telemetry-only warning mode
      AntiCheatService.onCheatWarning('SPEED_HACK', 'timing anomaly', {
        escalate: false,
      });
      // @ts-expect-error: testing telemetry-only warning mode
      AntiCheatService.onCheatWarning('SPEED_HACK', 'timing anomaly', {
        escalate: false,
      });

      expect(warningSpy).toHaveBeenCalledTimes(3);
      expect(detectionSpy).not.toHaveBeenCalled();
    });
  });

  describe('Reporting', () => {
    it('should report to Railway API when not in debug mode', async () => {
      mockPost.mockClear();

      AntiCheatService.init({
        reportToServer: true,
        debugMode: false,
      });

      // @ts-expect-error:  trigger detection
      AntiCheatService.onCheatDetected('DEBUGGER_DETECTED', 'details', 10);

      await vi.waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          '/api/v1/telemetry/cheat-reports',
          expect.objectContaining({
            cheatType: 'DEBUGGER_DETECTED',
          })
        );
      });
    });
  });

  describe('Fingerprinting', () => {
    it('should generate a consistent fingerprint', () => {
      AntiCheatService.init();
      const f1 = AntiCheatService.getFingerprint();

      // @ts-expect-error: testing
      AntiCheatService.constructor.resetForTesting();

      AntiCheatService.init();
      const f2 = AntiCheatService.getFingerprint();

      // Fingerprint should be the same if environment is same (simple hash)
      // Note: Date.now() suffix might differ, so we check first part
      expect(f1.substring(0, 5)).toBe(f2.substring(0, 5));
    });
  });

  describe('Negative Scenarios & Edge Cases', () => {
    it('should calibrate speed hack detection for high refresh-rate frames', () => {
      const warningSpy = vi.fn();
      let nowMs = 0;
      let frameCallback: FrameRequestCallback = () => undefined;
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: false,
      });
      vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
        frameCallback = callback;
        return 1;
      });
      EventBus.on('cheatWarning', warningSpy);

      AntiCheatService.init({
        detectSpeedHack: true,
        detectDevTools: false,
        detectDebugger: false,
        enableIntegrityChecks: false,
        debugMode: true,
      });

      for (let i = 0; i < 80; i += 1) {
        nowMs += 14.15;
        frameCallback(nowMs);
      }

      expect(warningSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SPEED_HACK',
        })
      );
    });

    it('should ignore normal 60fps after stuttered calibration samples', () => {
      const warningSpy = vi.fn();
      let nowMs = 0;
      let frameCallback: FrameRequestCallback = () => undefined;
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: false,
      });
      vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
        frameCallback = callback;
        return 1;
      });
      EventBus.on('cheatWarning', warningSpy);

      AntiCheatService.init({
        detectSpeedHack: true,
        detectDevTools: false,
        detectDebugger: false,
        enableIntegrityChecks: false,
        debugMode: true,
      });

      for (let i = 0; i < 30; i += 1) {
        nowMs += 20;
        frameCallback(nowMs);
      }
      for (let i = 0; i < 80; i += 1) {
        nowMs += 16.45;
        frameCallback(nowMs);
      }

      expect(warningSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SPEED_HACK',
        })
      );
    });

    it('should warn when frames run implausibly faster than the calibrated baseline', () => {
      const warningSpy = vi.fn();
      let nowMs = 0;
      let frameCallback: FrameRequestCallback = () => undefined;
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: false,
      });
      vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
        frameCallback = callback;
        return 1;
      });
      EventBus.on('cheatWarning', warningSpy);

      AntiCheatService.init({
        detectSpeedHack: true,
        detectDevTools: false,
        detectDebugger: false,
        enableIntegrityChecks: false,
        debugMode: true,
      });

      for (let i = 0; i < 60; i += 1) {
        nowMs += 16.67;
        frameCallback(nowMs);
      }

      for (let i = 0; i < 70; i += 1) {
        nowMs += 5;
        frameCallback(nowMs);
      }

      expect(warningSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SPEED_HACK',
          message: expect.stringContaining('Abnormal game speed'),
        })
      );
    });

    it('should be robust against invalid config values', () => {
      // @ts-expect-error: Testing invalid config injection
      AntiCheatService.init({ invalidKey: 123, detectDevTools: null });

      // Should still work and not crash
      expect(AntiCheatService.getFingerprint()).toBeDefined();
    });

    it('should handle rapid-fire integrity checks without crashing', () => {
      AntiCheatService.init({ enableIntegrityChecks: true, debugMode: true });

      // Register many values
      for (let i = 0; i < 100; i++) {
        AntiCheatService.registerCriticalValue(`test_${i}`, i);
      }

      // Fast forward multiple times
      vi.advanceTimersByTime(500);

      // No crash means pass
      expect(true).toBe(true);
    });
  });
});
