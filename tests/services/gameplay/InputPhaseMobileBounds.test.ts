import { describe, expect, it } from 'vitest';
import { createInitialPlayer } from '../../../config/PlayerConfig';
import { InputPhase } from '../../../services/gameplay/phases/InputPhase';
import { GameStatus, type GameState } from '../../../types';
import type { PhaseInput, TickContext } from '../../../services/gameplay/contracts';

describe('InputPhase mobile bounds', () => {
  it('lets the player reach the bottom canvas edge', () => {
    const width = 414;
    const height = 896;
    const player = createInitialPlayer(width / 2, height + 100);
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
    const input = {
      phase: 'input',
      context,
      shared: {
        deltaTime: 16,
        dtFactor: 1,
        timeMs: 1_000,
        width,
        height,
        deviceIsMobile: true,
        getMovementVector: () => ({ dx: 0, dy: 0 }),
        isDashPressed: () => false,
        isDashFreshPress: () => false,
        consumeDash: () => undefined,
      },
    } as unknown as PhaseInput<'input'>;

    new InputPhase().execute(input);

    expect(player.y).toBe(height - player.radius);
  });
});
