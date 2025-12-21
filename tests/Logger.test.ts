import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../services/Logger';

describe('Logger', () => {
  let consoleLogSpy: any;

  let consoleWarnSpy: any;

  let consoleErrorSpy: any;

  beforeEach(() => {
    Logger.clear();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Reset dev mode by default (it's true in setup.ts usually)
    // We might need to manipulate the private isDev property or verify what it is
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should store logs', () => {
    Logger.info('Test Info');
    const logs = Logger.getRecentLogs();
    expect(logs.length).toBe(1);
    expect(logs[0]!.message).toBe('Test Info');
  });

  it('should limit log storage', () => {
    for (let i = 0; i < 110; i++) {
      Logger.info(`Log ${i}`);
    }
    const logs = Logger.getRecentLogs(200);
    expect(logs.length).toBe(100); // Default maxLogs is 100
    expect(logs[logs.length - 1]!.message).toBe('Log 109');
  });

  describe('Development Mode', () => {
    it('should log debug messages to console', () => {
      Logger.debug('Debug Message');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Debug Message'));
    });

    it('should log info messages to console', () => {
      Logger.info('Info Message');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Info Message'));
    });

    it('should handle optional data', () => {
      Logger.debug('Data', { x: 1 });
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), { x: 1 });
    });
  });

  describe('Production Mode (Simulated)', () => {
    beforeEach(() => {
      (Logger as any).isDev = false;
    });

    afterEach(() => {
      (Logger as any).isDev = true;
    });

    it('should NOT log debug messages to console', () => {
      Logger.debug('Debug Message');
      expect(consoleLogSpy).not.toHaveBeenCalled();

      // Should still store it? Code says:
      // if (!this.isDev) return;
      // So it actually returns early!
      const logs = Logger.getRecentLogs();
      expect(logs.length).toBe(0);
    });

    it('should NOT log info messages to console (but store them)', () => {
      Logger.info('Info Message');
      expect(consoleLogSpy).not.toHaveBeenCalled();

      const logs = Logger.getRecentLogs();
      expect(logs.length).toBe(1);
    });
  });

  describe('Warnings and Errors', () => {
    it('should log warnings to console.warn', () => {
      Logger.warn('Warning!');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Warning!'));
    });

    it('should log errors to console.error', () => {
      Logger.error('Error!');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error!'));
    });

    it('should handle error objects', () => {
      const err = new Error('Oops');
      Logger.error('Crash', err);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), err);
    });
  });

  describe('Performance Logging', () => {
    it('should warn on frame drops', () => {
      Logger.perf('SlowOp', 50);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('(frame drop)'));
    });

    it('should debug log fast ops in dev', () => {
      Logger.perf('FastOp', 5);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('FastOp'));
    });

    it('should ignore fast ops in prod', () => {
      (Logger as any).isDev = false;
      Logger.perf('FastOp', 5);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      (Logger as any).isDev = true;
    });
  });

  describe('Game Events', () => {
    it('should log game events as debug', () => {
      Logger.gameEvent('LevelUp', { level: 2 });
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[GAME] LevelUp'), {
        level: 2,
      });
    });
  });
});
