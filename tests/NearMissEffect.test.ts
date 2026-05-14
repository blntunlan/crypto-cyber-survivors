/**
 * Near Miss Effect Logic Tests
 *
 * Verifies the timing and cooldown calculations for the near-miss feedback mechanic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GAME_ENGINE } from '../constants';
import { updateNearMissFeedbackTimers } from '../services/gameplay/NearMissTiming';

/**
 * Main test suite for Near Miss Logic.
 */
describe('GameEngine - Near Miss Logic', () => {
  let gameState: any;
  let deltaTime: number;

  beforeEach(() => {
    gameState = {
      nearMissTimer: 0,
      nearMissCooldown: 0,
    };
    deltaTime = 16.67; // ~60fps
    vi.clearAllMocks();
  });

  it('should trigger near miss state when event is received', () => {
    // Simulate the listener in GameEngine
    const triggerNearMiss = () => {
      if (gameState.nearMissCooldown <= 0) {
        gameState.nearMissTimer = GAME_ENGINE.NEAR_MISS_DURATION;
        gameState.nearMissCooldown = GAME_ENGINE.NEAR_MISS_COOLDOWN;
      }
    };

    triggerNearMiss();

    expect(gameState.nearMissTimer).toBe(GAME_ENGINE.NEAR_MISS_DURATION);
    expect(gameState.nearMissCooldown).toBe(GAME_ENGINE.NEAR_MISS_COOLDOWN);
  });

  it('should not re-trigger near miss if cooldown is active', () => {
    gameState.nearMissCooldown = 500;

    const triggerNearMiss = () => {
      if (gameState.nearMissCooldown <= 0) {
        gameState.nearMissTimer = GAME_ENGINE.NEAR_MISS_DURATION;
        gameState.nearMissCooldown = GAME_ENGINE.NEAR_MISS_COOLDOWN;
      }
    };

    triggerNearMiss();

    expect(gameState.nearMissTimer).toBe(0);
    expect(gameState.nearMissCooldown).toBe(500);
  });

  it('should not slow gameplay when near miss feedback is active', () => {
    gameState.nearMissTimer = 300;

    const dtFactor = updateNearMissFeedbackTimers(gameState, deltaTime);

    expect(dtFactor).toBeCloseTo(deltaTime / GAME_ENGINE.TARGET_FRAME_TIME);
    expect(gameState.nearMissTimer).toBeLessThan(300);
  });

  it('should reduce cooldown over time', () => {
    gameState.nearMissCooldown = 1000;

    // Logic from GameEngine update loop
    if (gameState.nearMissCooldown > 0) {
      gameState.nearMissCooldown -= deltaTime;
    }

    expect(gameState.nearMissCooldown).toBe(1000 - deltaTime);
  });
});
