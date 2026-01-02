/**
 * SynthEngine Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SynthEngine } from '../services/audio/SynthEngine';

describe('SynthEngine', () => {
  let engine: SynthEngine;

  beforeEach(() => {
    engine = new SynthEngine();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await engine.cleanup();
  });

  describe('initialization', () => {
    it('should initialize AudioContext on first init() call', () => {
      const context = engine.init();
      expect(context).not.toBeNull();
      expect(context?.ctx).toBeDefined();
    });

    it('should return existing context on subsequent init() calls', () => {
      const context1 = engine.init();
      const context2 = engine.init();
      expect(context1).toStrictEqual(context2);
    });

    it('should return context via getContext() if initialized', () => {
      expect(engine.getContext()).toBeNull();
      engine.init();
      expect(engine.getContext()).not.toBeNull();
    });
  });

  describe('volume and mute', () => {
    it('should set volume correctly within [0, 1] range', () => {
      engine.setVolume(0.5);
      expect(engine.getVolume()).toBe(0.5);

      engine.setVolume(1.5);
      expect(engine.getVolume()).toBe(1);

      engine.setVolume(-0.5);
      expect(engine.getVolume()).toBe(0);
    });

    it('should correctly toggle mute', () => {
      expect(engine.getMuted()).toBe(false);
      engine.toggleMute();
      expect(engine.getMuted()).toBe(true);
      engine.toggleMute();
      expect(engine.getMuted()).toBe(false);
    });

    it('should use setTargetAtTime for smooth volume transitions', () => {
      const context = engine.init();
      if (!context) throw new Error('Failed to init');

      const setTargetSpy = vi.spyOn(context.masterGain.gain, 'setTargetAtTime');

      engine.setVolume(0.5);
      expect(setTargetSpy).toHaveBeenCalledWith(0.5, expect.any(Number), 0.015);

      engine.setMuted(true);
      expect(setTargetSpy).toHaveBeenCalledWith(0, expect.any(Number), 0.015);
    });
  });

  describe('cooldown management', () => {
    it('should correctly report cooldown status', () => {
      // Use 'shoot' which has 50ms cooldown
      const shootType = 'shoot';
      expect(engine.isOnCooldown(shootType)).toBe(false);

      engine.recordPlay(shootType);
      expect(engine.isOnCooldown(shootType)).toBe(true);

      // Use vi.spyOn for cleaner mocking of performance.now
      const nowSpy = vi.spyOn(performance, 'now');
      const baseTime = performance.now();

      // Move forward 100ms
      nowSpy.mockReturnValue(baseTime + 100);
      expect(engine.isOnCooldown(shootType)).toBe(false);

      nowSpy.mockRestore();
    });
  });

  describe('oscillator management', () => {
    it('should create and track oscillators', () => {
      const result = engine.createOscillator('sine', 440);
      expect(result).not.toBeNull();

      const context = engine.init();
      if (!context) throw new Error('Failed to init');

      expect(context.ctx.createOscillator).toHaveBeenCalled();
      expect(context.ctx.createGain).toHaveBeenCalled();
    });

    it('should stop all active oscillators on stopAll()', () => {
      const res1 = engine.createOscillator('sine', 440);
      const res2 = engine.createOscillator('square', 880);

      if (!res1 || !res2) throw new Error('Failed to create oscillators');

      const stopSpy1 = vi.spyOn(res1.osc, 'stop');
      const stopSpy2 = vi.spyOn(res2.osc, 'stop');

      engine.stopAll();

      expect(stopSpy1).toHaveBeenCalled();
      expect(stopSpy2).toHaveBeenCalled();
    });

    it('should remove oscillators from set when they end', () => {
      const res = engine.createOscillator('sine', 440);
      if (!res) throw new Error('Failed');

      // Simulate onended event if possible
      if (res.osc.onended) {
        (res.osc as any).onended();
      }

      // No public way to check set size, but we can call stopAll and check spies
      const stopSpy = vi.spyOn(res.osc, 'stop');
      engine.stopAll();
      expect(stopSpy).not.toHaveBeenCalled();
    });
  });

  describe('resource cleanup', () => {
    it('should close AudioContext on cleanup()', async () => {
      engine.init();
      const context = engine.getContext();
      if (!context) throw new Error('Failed to init');

      const closeSpy = vi.spyOn(context.ctx, 'close');
      await engine.cleanup();
      expect(closeSpy).toHaveBeenCalled();
      expect(engine.getContext()).toBeNull();
    });
  });
});
