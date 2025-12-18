/**
 * AudioService Tests
 *
 * Tests for audio management including mute/volume controls.
 * Note: Sound playback tests are skipped as they require a real AudioContext.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AudioService } from '../services/audioService';

describe('AudioService', () => {
    let audioService: AudioService;

    beforeEach(() => {
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
});
