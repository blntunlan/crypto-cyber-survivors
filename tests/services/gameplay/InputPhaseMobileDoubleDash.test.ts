import { describe, expect, it } from 'vitest';
import { createInitialPlayer } from '../../../config/PlayerConfig';
import type { PhaseInput, TickContext } from '../../../services/gameplay/contracts';
import { InputPhase } from '../../../services/gameplay/phases/InputPhase';
import { GameStatus, type GameState } from '../../../types';

describe('InputPhase mobile double dash', () => {
  it('accepts the second press after movement dash ends but inside the mobile window', () => {
    const player = createInitialPlayer(200, 400);
    const gameState = {
      dashTimer: 0,
      dashHaloOpacity: 0,
      dashTrail: [],
      dashTrailAccumulator: 0,
      isDashing: false,
      dashCooldownTimer: 0,
      doubleDashUsed: false,
      doubleDashQueued: false,
      shake: 0,
      playerScaleX: 1,
      playerScaleY: 1,
      playerRotation: 0,
      lastMoveX: 1,
    } as unknown as GameState;
    const context = {
      status: GameStatus.PLAYING,
      world: {
        player: { current: player },
        gameState: { current: gameState },
        pool: {
          current: {
            activeEnemies: [],
            activeBullets: [],
            activeGems: [],
            activeParticles: [],
          },
        },
      },
    } as unknown as TickContext;
    let dashPressed = true;
    let freshPress = true;
    let deltaTime = 16;
    let timeMs = 16;
    const shared = {
      deltaTime,
      dtFactor: 1,
      timeMs,
      width: 400,
      height: 800,
      deviceIsMobile: true,
      getMovementVector: () => ({ dx: 1, dy: 0 }),
      isDashPressed: () => dashPressed,
      isDashFreshPress: () => freshPress,
      consumeDash: () => {
        dashPressed = false;
        freshPress = false;
      },
    };
    const input = {
      phase: 'input',
      context,
      shared,
    } as unknown as PhaseInput<'input'>;
    const phase = new InputPhase();

    phase.execute(input);
    expect(gameState.isDashing).toBe(true);

    deltaTime = 120;
    timeMs += deltaTime;
    shared.deltaTime = deltaTime;
    shared.timeMs = timeMs;
    phase.execute(input);
    expect(gameState.isDashing).toBe(false);

    dashPressed = true;
    freshPress = true;
    deltaTime = 16;
    timeMs += deltaTime;
    shared.deltaTime = deltaTime;
    shared.timeMs = timeMs;
    phase.execute(input);

    expect(gameState.isDashing).toBe(true);
    expect(gameState.doubleDashUsed).toBe(true);
  });
});
