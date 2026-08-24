import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PLAYER_MAX_HEALTH } from '@/game-v2/config/Mvp0Config';
import { type GameV2RuntimeReadout } from '@/game-v2/contracts/GameV2Debug';
import { type GameV2Phase } from '@/game-v2/contracts/GameV2Phase';
import {
  UNSPECIFIED_POSITION_CONTEXT,
  type PositionContext,
} from '@/game-v2/contracts/PositionContext';
import {
  type MarketFeedSource,
  type MarketFeedUpdate,
} from '@/game-v2/market/MarketFeedSource';
import type * as CreateMvp0RuntimeModule from '@/game-v2/runtime/createMvp0Runtime';
import { type Mvp0RuntimeOptions } from '@/game-v2/runtime/createMvp0Runtime';
import GameV2App from '@/game-v2/GameV2App';

/**
 * `V2-201` acceptance evidence: restart after game-over returns to the
 * selection screen and locks a fresh position, rather than reusing the old
 * runtime (`V2-ADR-088`). Reaching a real `game-over` takes hundreds of
 * combat ticks (the MVP-0 scripted acceptance run dies at tick 789), which
 * is impractical inside a jsdom component test — `GameV2App.test.tsx`'s
 * other tests all use the real runtime for exactly that reason and never
 * drive gameplay to a specific phase either. This file mocks
 * `createMvp0Runtime` to start already `game-over`, so only the restart
 * *wiring* is under test, isolated in its own file because the mock is
 * module-wide and would otherwise break every other GameV2App test.
 */

const EMPTY_ABILITY_SLOTS = Array.from({ length: 4 }, () => null);

const createFakeReadout = (phase: GameV2Phase): GameV2RuntimeReadout => ({
  tick: 0,
  phase,
  playerX: 0,
  playerY: 0,
  playerHealth: PLAYER_MAX_HEALTH,
  playerMaxHealth: PLAYER_MAX_HEALTH,
  playerLevel: 1,
  weaponDamage: 10,
  moveSpeed: 6,
  moveSpeedLevel: 0,
  moveSpeedUpgradable: true,
  invulnerabilityTicks: 0,
  dashCooldownTicks: 0,
  enemyCount: 0,
  projectileCount: 0,
  xpPickupCount: 0,
  nearestEnemyX: null,
  nearestEnemyY: null,
  nearestXpPickupX: null,
  nearestXpPickupY: null,
  abilitySlots: EMPTY_ABILITY_SLOTS,
  levelUpOffer: null,
  rerollCharges: 0,
  banishCharges: 0,
  convergenceProgress: 0,
  convergenceReached: false,
});

const positionContextsSeen: PositionContext[] = [];

vi.mock('@/game-v2/runtime/createMvp0Runtime', async importOriginal => {
  const actual = await importOriginal<typeof CreateMvp0RuntimeModule>();

  return {
    ...actual,
    createMvp0Runtime: vi.fn((options: Mvp0RuntimeOptions) => {
      const positionContext = options.positionContext ?? UNSPECIFIED_POSITION_CONTEXT;
      positionContextsSeen.push(positionContext);

      return {
        phase: 'game-over' as GameV2Phase,
        tick: 0,
        start: () => {},
        advanceFrame: () => {},
        readout: () => createFakeReadout('game-over'),
        debugSnapshot: () => ({ ...createFakeReadout('game-over'), stateHash: 'fake' }),
        resize: () => {},
        dispose: () => {},
        chooseUpgrade: () => {},
        rerollOffer: () => {},
        banishOffer: () => {},
      };
    }),
  };
});

const VALID_UPDATE: MarketFeedUpdate = Object.freeze({
  price: 65_000,
  rsi: 55,
  rsiState: 'NEUTRAL',
  atrPercent: 1.5,
  normalizedVolume: 2.3,
  volumePercentile: 0.7,
  whaleTier: 2,
  trendStrength: 0.4,
  trendDirection: 'UP',
  timestamp: 1_700_000_000_000,
  isSynthetic: false,
});

const createFakeMarketFeedSource = (): (() => MarketFeedSource) => {
  let priceIncrement = 0;

  return () => ({
    connect: onUpdate => {
      priceIncrement += 1;
      onUpdate({ ...VALID_UPDATE, price: VALID_UPDATE.price + priceIncrement });
    },
    disconnect: () => {},
  });
};

afterEach(() => {
  cleanup();
  delete window.gameV2Debug;
  positionContextsSeen.length = 0;
});

describe('GameV2App restart (V2-201)', () => {
  it('returns to the selection screen on restart and locks a fresh position on the next Start', async () => {
    const createSource = createFakeMarketFeedSource();
    render(<GameV2App createMarketFeedSource={createSource} />);

    await waitFor(() => {
      expect(screen.getByTestId('position-select-start')).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId('position-select-side-short'));
    fireEvent.click(screen.getByTestId('position-select-leverage-10'));
    fireEvent.click(screen.getByTestId('position-select-start'));

    await waitFor(() => {
      expect(screen.getByTestId('game-over-overlay')).toBeInTheDocument();
    });

    expect(positionContextsSeen).toHaveLength(1);
    expect(positionContextsSeen[0]).toMatchObject({ side: 'SHORT', leverage: 10 });

    fireEvent.click(screen.getByRole('button', { name: /run it back/i }));

    // Restart returns to selection rather than resuming the same runtime.
    await waitFor(() => {
      expect(screen.getByTestId('position-select-overlay')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('game-over-overlay')).not.toBeInTheDocument();
    // Defaults reset for the new selection, not carried over from the last run.
    expect(screen.getByTestId('position-select-side-long')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await waitFor(() => {
      expect(screen.getByTestId('position-select-start')).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId('position-select-start'));

    await waitFor(() => {
      expect(positionContextsSeen).toHaveLength(2);
    });

    // A genuinely new position, not the same object reused.
    expect(positionContextsSeen[1]).not.toBe(positionContextsSeen[0]);
    expect(positionContextsSeen[1]).toMatchObject({ side: 'LONG', leverage: 1 });
    expect(positionContextsSeen[1]?.entryPrice).not.toBe(
      positionContextsSeen[0]?.entryPrice
    );
  });
});
