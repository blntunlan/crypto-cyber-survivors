import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AntiCheatService } from '../../services/AntiCheatService';
import { EventBus } from '../../services/EventBus';
import { supabase } from '../../services/Supabase';

// Mock Supabase
vi.mock('../../services/Supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
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
  });

  describe('Reporting', () => {
    it('should report to Supabase when not in debug mode', async () => {
      // Mock supabase.from().insert()
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      const fromMock = vi.fn(() => ({ insert: insertMock }));
      // @ts-expect-error: testing
      supabase.from = fromMock;

      AntiCheatService.init({
        reportToServer: true,
        debugMode: false,
      });

      // @ts-expect-error:  trigger detection
      AntiCheatService.onCheatDetected('DEBUGGER_DETECTED', 'details', 10);

      expect(fromMock).toHaveBeenCalledWith('cheat_attempts');
      expect(insertMock).toHaveBeenCalled();
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
});
