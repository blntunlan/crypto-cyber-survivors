import { type MarketAsset } from '@/game-v2/contracts/MarketSnapshot';

export type PositionSide = 'LONG' | 'SHORT';

/** The five displayed leverage modes (design §7.3). */
export type LeverageMode = 1 | 5 | 10 | 25 | 50;

export const LEVERAGE_MODES: readonly LeverageMode[] = Object.freeze([
  1, 5, 10, 25, 50,
]);

/**
 * The player's locked run position (design §2/§3.2). Constructed once,
 * before `GameV2Runtime` exists (`V2-ADR-088`), and never mutated — nothing
 * in `GameV2Runtime` exposes a way to change it once the runtime is built.
 */
export type PositionContext = Readonly<{
  asset: MarketAsset;
  side: PositionSide;
  leverage: LeverageMode;
  entryPrice: number;
  lockedAtTick: number;
}>;

/**
 * Loosely typed so the runtime checks below are meaningful to `tsc` too —
 * mirroring `assertEnemyDefinition`'s `unknown`-input pattern — rather than
 * accepting the already-narrow `PositionContext` shape a caller could in
 * principle bypass with a type cast.
 */
export type PositionContextInput = {
  asset: MarketAsset;
  side: string;
  leverage: number;
  entryPrice: number;
  lockedAtTick: number;
};

/**
 * Validates and freezes a `PositionContext`. Throws on invalid input, unlike
 * `V2-200`'s `normalizeMarketUpdate` — this is fed by already-validated UI
 * selection state (a closed set of buttons), not parsed external bytes, so
 * invalid input here is a real internal defect (`V2-ADR-091`).
 */
export const createPositionContext = (input: PositionContextInput): PositionContext => {
  if (input.side !== 'LONG' && input.side !== 'SHORT') {
    throw new RangeError('position side must be LONG or SHORT');
  }

  if (!LEVERAGE_MODES.includes(input.leverage as LeverageMode)) {
    throw new RangeError(`leverage must be one of ${LEVERAGE_MODES.join(', ')}`);
  }

  if (!Number.isFinite(input.entryPrice) || input.entryPrice <= 0) {
    throw new RangeError('entryPrice must be a finite positive number');
  }

  if (!Number.isInteger(input.lockedAtTick) || input.lockedAtTick < 0) {
    throw new RangeError('lockedAtTick must be a non-negative integer');
  }

  return Object.freeze({
    asset: input.asset,
    side: input.side,
    leverage: input.leverage as LeverageMode,
    entryPrice: input.entryPrice,
    lockedAtTick: input.lockedAtTick,
  });
};

/**
 * A clearly-non-real placeholder for headless/test runtime composition that
 * has not locked a real position through `PositionSelectScreen`
 * (`V2-ADR-089`). `GameV2App` always supplies a real, user-locked
 * `PositionContext` instead. `entryPrice: 1` is deliberately not
 * BTC-price-shaped — a value that could pass for real data would defeat the
 * point of a placeholder.
 */
export const UNSPECIFIED_POSITION_CONTEXT: PositionContext = createPositionContext({
  asset: 'BTC',
  side: 'LONG',
  leverage: 1,
  entryPrice: 1,
  lockedAtTick: 0,
});
