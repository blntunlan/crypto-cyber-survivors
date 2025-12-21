/**
 * AudioService Tests
 *
 * Tests for audio management including mute/volume controls.
 * Updated for modular audio system architecture.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioService } from '../services/audio/AudioService';
import { synthEngine } from '../services/audio/SynthEngine';

vi.mock('howler', () => {
  return {
    Howl: class {
      play() {
        return 1;
      }
      stop() {}
      unload() {}
    },
    Howler: {
      volume: () => {},
      mute: () => {},
    },
  };
});

describe('AudioService', () => {
  let audioService: AudioService;

  beforeEach(() => {
    // Reset synthEngine state between tests
    (synthEngine as any).ctx = null;
    (synthEngine as any).masterGain = null;
    (synthEngine as any).isMuted = false;
    (synthEngine as any).volume = 1.0;
    (synthEngine as any).lastPlayTime.clear();

    audioService = new AudioService();
  });

  describe('mute controls', () => {
    it('should start unmuted', () => {
      expect(audioService.getMuted()).toBe(false);
    });

    it('should toggle mute state', () => {
      expect(audioService.getMuted()).toBe(false);

      audioService.toggleMute();
      expect(audioService.getMuted()).toBe(true);

      audioService.toggleMute();
      expect(audioService.getMuted()).toBe(false);
    });

    it('should return new mute state from toggleMute', () => {
      const newState = audioService.toggleMute();
      expect(newState).toBe(true);
      expect(audioService.getMuted()).toBe(true);
    });
  });

  describe('volume controls', () => {
    it('should start with volume at 1.0', () => {
      expect(audioService.getVolume()).toBe(1.0);
    });

    it('should set volume within valid range', () => {
      audioService.setVolume(0.5);
      expect(audioService.getVolume()).toBe(0.5);
    });

    it('should clamp volume to minimum 0', () => {
      audioService.setVolume(-0.5);
      expect(audioService.getVolume()).toBe(0);
    });

    it('should clamp volume to maximum 1', () => {
      audioService.setVolume(1.5);
      expect(audioService.getVolume()).toBe(1);
    });

    it('should accept boundary values', () => {
      audioService.setVolume(0);
      expect(audioService.getVolume()).toBe(0);

      audioService.setVolume(1);
      expect(audioService.getVolume()).toBe(1);
    });
  });

  describe('state persistence', () => {
    it('should maintain mute state across multiple toggles', () => {
      audioService.toggleMute(); // true
      audioService.toggleMute(); // false
      audioService.toggleMute(); // true

      expect(audioService.getMuted()).toBe(true);
    });

    it('should maintain volume after mute/unmute cycle', () => {
      audioService.setVolume(0.7);
      audioService.toggleMute();
      audioService.toggleMute();

      expect(audioService.getVolume()).toBe(0.7);
    });
  });

  describe('synthesized sounds', () => {
    it('should have mocked AudioContext globally', () => {
      expect(window.AudioContext).toBeDefined();
      const c = new window.AudioContext();
      expect(c.createOscillator).toBeDefined();
    });

    it('should initialize AudioContext on first play', () => {
      audioService.playButton();
      // Access synthEngine's context
      const context = (synthEngine as any).ctx;
      expect(context).not.toBeNull();
    });

    it('should play shoot sound', () => {
      audioService.playShoot();
      const ctx = (synthEngine as any).ctx;
      expect(ctx).not.toBeNull();
      expect(ctx?.createOscillator).toHaveBeenCalled();
      expect(ctx?.createGain).toHaveBeenCalled();
    });

    it('should handle multi-projectile shoot sound', () => {
      audioService.playShoot(1, 3);
      const ctx = (synthEngine as any).ctx;
      const oscillators = ctx!.createOscillator.mock.results.length;
      expect(oscillators).toBeGreaterThanOrEqual(1);
    });

    it('should play crit sound', () => {
      audioService.playCrit();
      expect((synthEngine as any).ctx!.createOscillator).toHaveBeenCalled();
    });

    it('should play hit sound', () => {
      audioService.playHit();
      expect((synthEngine as any).ctx.createBiquadFilter).toHaveBeenCalled();
    });

    it('should play gem sound', () => {
      audioService.playGem();
      expect((synthEngine as any).ctx.createOscillator).toHaveBeenCalled();
    });

    it('should play level up sound', () => {
      audioService.playLevelUp();
      expect((synthEngine as any).ctx.createOscillator).toHaveBeenCalled();
    });

    it('should play dash sound', () => {
      audioService.playDash();
      expect((synthEngine as any).ctx.createOscillator).toHaveBeenCalled();
    });

    it('should play combo sound', () => {
      audioService.playCombo(2);
      expect((synthEngine as any).ctx.createOscillator).toHaveBeenCalled();
    });

    it('should play death sound', () => {
      audioService.playDeath();
      expect((synthEngine as any).ctx.createOscillator).toHaveBeenCalled();
    });

    it('should respect cooldowns', () => {
      vi.useFakeTimers();
      // Advance time so performance.now() is not 0
      vi.advanceTimersByTime(100);

      // First call initializes and plays
      audioService.playShoot();

      // Access synthEngine's ctx
      const ctx = (synthEngine as any).ctx;
      expect(ctx).not.toBeNull();

      const initialCalls = ctx.createOscillator.mock.calls.length;
      expect(initialCalls).toBeGreaterThan(0);

      // Second call immediately after should be blocked by cooldown
      audioService.playShoot();
      expect(ctx.createOscillator).toHaveBeenCalledTimes(initialCalls);

      // Advance time past cooldown (60ms)
      vi.advanceTimersByTime(100);
      audioService.playShoot();
      expect(ctx.createOscillator).toHaveBeenCalledTimes(initialCalls + 1);
      vi.useRealTimers();
    });

    describe('Combo Milestones', () => {
      it('should play all combo milestone sounds', () => {
        const milestones = ['combo1', 'combo2', 'combo3', 'combo4', 'combo5'] as const;

        milestones.forEach(m => {
          // Clear mocks to ensure isolated counting
          const ctx = (synthEngine as any).ctx;
          if (ctx?.createOscillator) {
            ctx.createOscillator.mockClear();
          }

          audioService.playComboMilestone(m);
          expect((synthEngine as any).ctx!.createOscillator).toHaveBeenCalled();
        });
      });
    });

    describe('Slot Machine Sounds', () => {
      it('should play slot tick', () => {
        audioService.playSlotTick(1.0);
        expect((synthEngine as any).ctx!.createOscillator).toHaveBeenCalled();
      });

      it('should play anticipation sound', () => {
        audioService.playAnticipation(1.0);
        expect((synthEngine as any).ctx!.createOscillator).toHaveBeenCalled();
      });

      it('should respect slot tick cooldown', () => {
        vi.useFakeTimers();
        vi.advanceTimersByTime(1000); // Start at t=1000

        audioService.playSlotTick(1.0);

        const ctx = (synthEngine as any).ctx;
        expect(ctx).toBeDefined();

        const initialCalls = ctx.createOscillator.mock.calls.length;

        // Immediate call should be blocked
        audioService.playSlotTick(1.0);
        expect((synthEngine as any).ctx.createOscillator).toHaveBeenCalledTimes(initialCalls);

        // Advance time
        vi.advanceTimersByTime(100);
        audioService.playSlotTick(1.0);
        expect((synthEngine as any).ctx.createOscillator).toHaveBeenCalledTimes(initialCalls + 1);

        vi.useRealTimers();
      });
    });

    describe('Howler Integration', () => {
      it('should load sound via Howler', () => {
        const howl = audioService.loadSound('test', 'test.mp3');
        expect(howl).toBeDefined();
        // Verify caching
        const cached = audioService.loadSound('test', 'test.mp3');
        expect(cached).toBe(howl);
      });

      it('should play loaded sound', () => {
        const howl = audioService.loadSound('test2', 'test2.mp3');
        // Mock play on the howl instance
        howl.play = vi.fn();

        audioService.playSound('test2');
        expect(howl.play).toHaveBeenCalled();
      });

      it('should stop loaded sound', () => {
        const howl = audioService.loadSound('test3', 'test3.mp3');
        howl.stop = vi.fn();

        audioService.stopSound('test3');
        expect(howl.stop).toHaveBeenCalled();
      });

      it('should unload all sounds', () => {
        const howl1 = audioService.loadSound('u1', 'u1.mp3');
        howl1.unload = vi.fn();
        const howl2 = audioService.loadSound('u2', 'u2.mp3');
        howl2.unload = vi.fn();

        audioService.unloadAll();
        expect(howl1.unload).toHaveBeenCalled();
        expect(howl2.unload).toHaveBeenCalled();
      });
    });
  });
});
