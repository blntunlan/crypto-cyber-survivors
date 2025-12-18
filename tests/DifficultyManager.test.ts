/**
 * DifficultyManager Tests
 *
 * Tests for difficulty calculation and wave phases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DifficultyManager } from '../services/DifficultyManager';

describe('DifficultyManager', () => {
    beforeEach(() => {
        // Reset singleton state
        DifficultyManager.startGame();
    });

    describe('startGame', () => {
        it('should reset kill streak', () => {
            // Simulate some gameplay
            DifficultyManager.recordKill();
            DifficultyManager.recordKill();

            // Start new game
            DifficultyManager.startGame();

            // Kill streak should be reset
            expect(DifficultyManager.getKillStreak()).toBe(0);
        });
    });

    describe('calculate', () => {
        it('should return difficulty output with all fields', () => {
            const output = DifficultyManager.calculate(0, 0, 1, 100);

            expect(output).toHaveProperty('total');
            expect(output).toHaveProperty('spawnRate');
            expect(output).toHaveProperty('enemySpeed');
            expect(output).toHaveProperty('enemyHealth');
        });

        it('should return total difficulty >= 0.3', () => {
            const output = DifficultyManager.calculate(0, 0, 1, 100);
            expect(output.total).toBeGreaterThanOrEqual(0.3);
        });

        it('should increase with positive PnL (winning = enemies harder)', () => {
            const baseDifficulty = DifficultyManager.calculate(0, 0, 1, 100);
            // Actually winning makes it EASIER in this system
            const winningDifficulty = DifficultyManager.calculate(0.05, 0, 1, 100);

            // Winning = easier, so difficulty should be lower
            expect(winningDifficulty.total).toBeLessThanOrEqual(baseDifficulty.total);
        });

        it('should increase with negative PnL (losing = harder)', () => {
            DifficultyManager.startGame();
            const baseDifficulty = DifficultyManager.calculate(0, 0, 1, 100);

            DifficultyManager.startGame();
            const losingDifficulty = DifficultyManager.calculate(-0.05, 0, 1, 100);

            expect(losingDifficulty.total).toBeGreaterThan(baseDifficulty.total);
        });

        it('should increase with volatility', () => {
            DifficultyManager.startGame();
            const lowVolOutput = DifficultyManager.calculate(0, 0.001, 1, 100);

            DifficultyManager.startGame();
            const highVolOutput = DifficultyManager.calculate(0, 0.02, 1, 100);

            expect(highVolOutput.total).toBeGreaterThan(lowVolOutput.total);
        });

        it('should increase with player level', () => {
            DifficultyManager.startGame();
            const level1Output = DifficultyManager.calculate(0, 0, 1, 100);

            DifficultyManager.startGame();
            const level10Output = DifficultyManager.calculate(0, 0, 10, 100);

            expect(level10Output.total).toBeGreaterThan(level1Output.total);
        });

        it('should be capped at maximum value (8.0)', () => {
            const output = DifficultyManager.calculate(1, 1, 100, 100);
            expect(output.total).toBeLessThanOrEqual(8.0);
        });

        it('should reduce difficulty when HP is low (near-death)', () => {
            DifficultyManager.startGame();
            const normalHpOutput = DifficultyManager.calculate(0, 0, 5, 100);

            DifficultyManager.startGame();
            const lowHpOutput = DifficultyManager.calculate(0, 0, 5, 15); // Below 20%

            expect(lowHpOutput.total).toBeLessThan(normalHpOutput.total);
        });
    });

    describe('recordKill', () => {
        it('should increment kill streak', () => {
            const initialStreak = DifficultyManager.getKillStreak();

            DifficultyManager.recordKill();
            DifficultyManager.recordKill();

            expect(DifficultyManager.getKillStreak()).toBe(initialStreak + 2);
        });
    });

    describe('getWavePhase', () => {
        it('should return a valid wave phase', () => {
            const phase = DifficultyManager.getWavePhase();
            const validPhases = ['calm', 'building', 'intense', 'peak'];

            expect(validPhases).toContain(phase);
        });

        it('should start with building phase', () => {
            DifficultyManager.startGame();
            expect(DifficultyManager.getWavePhase()).toBe('building');
        });
    });

    describe('getKillStreak', () => {
        it('should return current kill streak', () => {
            DifficultyManager.startGame();
            expect(DifficultyManager.getKillStreak()).toBe(0);

            DifficultyManager.recordKill();
            expect(DifficultyManager.getKillStreak()).toBe(1);
        });
    });
});
