import { describe, it, expect, beforeEach } from 'vitest';
import { DifficultyManager } from '../../services/gameplay/DifficultyManager';
import { DIFFICULTY } from '../../constants';

describe('Leverage-based Difficulty Scaling', () => {
  beforeEach(() => {
    DifficultyManager.reset();
  });

  it('should apply correct scaling for 1x leverage', () => {
    DifficultyManager.startGame(1);
    const output = DifficultyManager.calculate(0, 0.02, 1, 100, undefined, true);

    // With 1x leverage and baseline stats, everything should be near 1.0 (plus time pressure etc)
    expect(output.enemyDamage).toBeGreaterThan(0.9);
    expect(output.spawnRate).toBeGreaterThan(0.9);
    expect(output.enemySpeed).toBeGreaterThan(0.9);
  });

  it('should apply aggressive scaling for 100x leverage', () => {
    DifficultyManager.startGame(100);
    const output = DifficultyManager.calculate(0, 0.02, 1, 100, undefined, true);

    // 100x leverage should boost difficulty (moderate — LeverageEngine handles primary scaling)
    expect(output.enemyDamage).toBeGreaterThan(1.5);
    expect(output.spawnRate).toBeGreaterThan(1.0);
    expect(output.enemySpeed).toBeGreaterThan(1.0);
  });

  it('should scale spawnRate correctly with leverage', () => {
    DifficultyManager.startGame(1);
    const spawn1x = DifficultyManager.calculate(
      0,
      0.02,
      1,
      100,
      undefined,
      true
    ).spawnRate;

    DifficultyManager.reset();
    DifficultyManager.startGame(100);
    const spawn100x = DifficultyManager.calculate(
      0,
      0.02,
      1,
      100,
      undefined,
      true
    ).spawnRate;

    // 100x should have more spawn than 1x and remain within system cap
    expect(spawn100x).toBeGreaterThan(spawn1x);
    expect(spawn100x).toBeLessThanOrEqual(DIFFICULTY.SPAWN_RATE_MAX);
  });

  it('should scale enemyDamage correctly with leverage', () => {
    DifficultyManager.startGame(1);
    const damage1x = DifficultyManager.calculate(
      0,
      0.02,
      1,
      100,
      undefined,
      true
    ).enemyDamage;

    DifficultyManager.reset();
    DifficultyManager.startGame(100);
    const damage100x = DifficultyManager.calculate(
      0,
      0.02,
      1,
      100,
      undefined,
      true
    ).enemyDamage;

    // 100x should be deadlier than 1x (moderate gap — LeverageEngine adds more)
    expect(damage100x).toBeGreaterThan(damage1x * 1.5);
  });

  it('should clamp values to max/min limits even with leverage', () => {
    DifficultyManager.startGame(100);
    // Extreme values to force clamping
    const output = DifficultyManager.calculate(-0.5, 0.1, 50, 10, undefined, true);

    expect(output.spawnRate).toBeLessThanOrEqual(DIFFICULTY.SPAWN_RATE_MAX);
    expect(output.enemySpeed).toBeLessThanOrEqual(DIFFICULTY.ENEMY_SPEED_MAX);
    expect(output.enemyDamage).toBeLessThanOrEqual(5.0); // Balanced max clamp for Director output
  });
});
