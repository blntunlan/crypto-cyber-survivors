/**
 * GameStore Tests
 *
 * Tests for Zustand state management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../../stores/gameStore';

describe('GameStore', () => {
    beforeEach(() => {
        // Reset store to initial state before each test
        useGameStore.setState({
            audio: {
                masterVolume: 1.0,
                sfxVolume: 0.8,
                musicVolume: 0.5,
                isMuted: false,
            },
            graphics: {
                showParticles: true,
                showScreenShake: true,
                showDamageNumbers: true,
                reducedMotion: false,
            },
            progress: {
                totalGamesPlayed: 0,
                totalPlayTime: 0,
                highScore: 0,
                highestLevel: 0,
                totalKills: 0,
                totalDeaths: 0,
                bestSurvivalTime: 0,
                favoritePosition: null,
                cardsCollected: [],
                achievementsUnlocked: [],
            },
            hasSeenTutorial: false,
        });
    });

    describe('audio settings', () => {
        it('should set master volume', () => {
            useGameStore.getState().setMasterVolume(0.5);
            expect(useGameStore.getState().audio.masterVolume).toBe(0.5);
        });

        it('should clamp volume to valid range', () => {
            useGameStore.getState().setMasterVolume(1.5);
            expect(useGameStore.getState().audio.masterVolume).toBe(1);

            useGameStore.getState().setMasterVolume(-0.5);
            expect(useGameStore.getState().audio.masterVolume).toBe(0);
        });

        it('should toggle mute', () => {
            expect(useGameStore.getState().audio.isMuted).toBe(false);
            useGameStore.getState().toggleMute();
            expect(useGameStore.getState().audio.isMuted).toBe(true);
        });

        it('should set sfx volume', () => {
            useGameStore.getState().setSfxVolume(0.3);
            expect(useGameStore.getState().audio.sfxVolume).toBe(0.3);
        });

        it('should set music volume', () => {
            useGameStore.getState().setMusicVolume(0.7);
            expect(useGameStore.getState().audio.musicVolume).toBe(0.7);
        });
    });

    describe('graphics settings', () => {
        it('should toggle particles', () => {
            expect(useGameStore.getState().graphics.showParticles).toBe(true);
            useGameStore.getState().toggleParticles();
            expect(useGameStore.getState().graphics.showParticles).toBe(false);
        });

        it('should toggle screen shake', () => {
            expect(useGameStore.getState().graphics.showScreenShake).toBe(true);
            useGameStore.getState().toggleScreenShake();
            expect(useGameStore.getState().graphics.showScreenShake).toBe(false);
        });

        it('should toggle damage numbers', () => {
            expect(useGameStore.getState().graphics.showDamageNumbers).toBe(true);
            useGameStore.getState().toggleDamageNumbers();
            expect(useGameStore.getState().graphics.showDamageNumbers).toBe(false);
        });

        it('should toggle reduced motion', () => {
            expect(useGameStore.getState().graphics.reducedMotion).toBe(false);
            useGameStore.getState().toggleReducedMotion();
            expect(useGameStore.getState().graphics.reducedMotion).toBe(true);
        });
    });

    describe('progress tracking', () => {
        it('should record game end stats', () => {
            useGameStore.getState().recordGameEnd(1000, 5, 120, 50);

            const progress = useGameStore.getState().progress;
            expect(progress.totalGamesPlayed).toBe(1);
            expect(progress.highScore).toBe(1000);
            expect(progress.highestLevel).toBe(5);
            expect(progress.bestSurvivalTime).toBe(120);
            expect(progress.totalKills).toBe(50);
        });

        it('should only update high score if higher', () => {
            useGameStore.getState().recordGameEnd(1000, 5, 120, 50);
            useGameStore.getState().recordGameEnd(500, 3, 60, 25);

            expect(useGameStore.getState().progress.highScore).toBe(1000);
            expect(useGameStore.getState().progress.totalGamesPlayed).toBe(2);
        });

        it('should accumulate kills and play time', () => {
            useGameStore.getState().recordGameEnd(100, 1, 60, 10);
            useGameStore.getState().recordGameEnd(200, 2, 80, 20);

            const progress = useGameStore.getState().progress;
            expect(progress.totalKills).toBe(30);
            expect(progress.totalPlayTime).toBe(140);
            expect(progress.totalDeaths).toBe(2);
        });

        it('should add cards to collection', () => {
            useGameStore.getState().addCardCollected('diamond-hands');
            useGameStore.getState().addCardCollected('hodl');

            expect(useGameStore.getState().progress.cardsCollected).toContain('diamond-hands');
            expect(useGameStore.getState().progress.cardsCollected).toContain('hodl');
        });

        it('should not duplicate cards', () => {
            useGameStore.getState().addCardCollected('diamond-hands');
            useGameStore.getState().addCardCollected('diamond-hands');

            expect(useGameStore.getState().progress.cardsCollected.length).toBe(1);
        });

        it('should reset progress', () => {
            useGameStore.getState().recordGameEnd(1000, 5, 120, 50);
            useGameStore.getState().resetProgress();

            expect(useGameStore.getState().progress.highScore).toBe(0);
            expect(useGameStore.getState().progress.totalGamesPlayed).toBe(0);
        });
    });

    describe('session management', () => {
        it('should increment games played', () => {
            useGameStore.getState().incrementGamesPlayed();
            expect(useGameStore.getState().session.gamesThisSession).toBe(1);
        });

        it('should start new session with unique id', () => {
            const oldSessionId = useGameStore.getState().session.sessionId;
            useGameStore.getState().startNewSession();
            const newSessionId = useGameStore.getState().session.sessionId;

            expect(newSessionId).not.toBe(oldSessionId);
        });
    });

    describe('tutorial', () => {
        it('should mark tutorial as seen', () => {
            expect(useGameStore.getState().hasSeenTutorial).toBe(false);
            useGameStore.getState().markTutorialSeen();
            expect(useGameStore.getState().hasSeenTutorial).toBe(true);
        });
    });

    describe('reset settings', () => {
        it('should reset all settings to defaults', () => {
            useGameStore.getState().setMasterVolume(0.1);
            useGameStore.getState().toggleMute();
            useGameStore.getState().toggleParticles();

            useGameStore.getState().resetSettings();

            expect(useGameStore.getState().audio.masterVolume).toBe(1.0);
            expect(useGameStore.getState().audio.isMuted).toBe(false);
            expect(useGameStore.getState().graphics.showParticles).toBe(true);
        });
    });
});
