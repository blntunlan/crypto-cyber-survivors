import { describe, it, expect, beforeEach } from 'vitest';
import { DifficultyManager } from '../../services/DifficultyManager';
import { DIFFICULTY } from '../../constants';

describe('Leverage-based Difficulty Scaling', () => {
  beforeEach(() => {
    DifficultyManager.reset();
  });

  it('should apply correct scaling for 1x leverage', () => {
    DifficultyManager.startGame(1);
    const output = DifficultyManager.calculate(0, 0.02, 1, 100);

    // Leverage 1x: { spawn: 0.8, speed: 0.8, hp: 0.8, damage: 0.8, xpReq: 1.0 }
    expect(output.factors.leverageDamage).toBe(0.8);
    expect(output.factors.leverageSpawn).toBe(0.8);
    expect(output.factors.leverageSpeed).toBe(0.8);
  });

  it('should apply aggressive scaling for 100x leverage', () => {
    DifficultyManager.startGame(100);
    const output = DifficultyManager.calculate(0, 0.02, 1, 100);

    // Leverage 100x: { spawn: 6.0, speed: 2.0, hp: 1.6, damage: 3.0, xpReq: 5.0 }
    expect(output.factors.leverageDamage).toBe(3.0);
    expect(output.factors.leverageSpawn).toBe(6.0);
    expect(output.factors.leverageSpeed).toBe(2.0);
  });

  it('should scale spawnRate correctly with leverage', () => {
    DifficultyManager.startGame(1);
    const spawn1x = DifficultyManager.calculate(0, 0.02, 1, 100).spawnRate;

    DifficultyManager.reset();
    DifficultyManager.startGame(100);
    const spawn100x = DifficultyManager.calculate(0, 0.02, 1, 100).spawnRate;

    // 100x should have more spawn than 1x, but capped at max
    expect(spawn100x).toBeGreaterThan(spawn1x);
    expect(spawn100x).toBe(DIFFICULTY.SPAWN_RATE_MAX);
  });

  it('should scale enemyDamage correctly with leverage', () => {
    DifficultyManager.startGame(1);
    const damage1x = DifficultyManager.calculate(0, 0.02, 1, 100).enemyDamage;

    DifficultyManager.reset();
    DifficultyManager.startGame(100);
    const damage100x = DifficultyManager.calculate(0, 0.02, 1, 100).enemyDamage;

    // 100x should have 3.75x more damage (3.0 / 0.8)
    expect(damage100x).toBeCloseTo(damage1x * 3.75, 1);
  });

  it('should clamp values to max/min limits even with leverage', () => {
    DifficultyManager.startGame(100);
    // Extreme values to force clamping
    const output = DifficultyManager.calculate(-0.5, 0.1, 50, 10);

    expect(output.spawnRate).toBeLessThanOrEqual(DIFFICULTY.SPAWN_RATE_MAX);
    expect(output.enemySpeed).toBeLessThanOrEqual(DIFFICULTY.ENEMY_SPEED_MAX);
    expect(output.enemyDamage).toBeLessThanOrEqual(DIFFICULTY.ENEMY_DAMAGE_MAX);
  });
});
