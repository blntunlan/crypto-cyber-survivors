import { describe, it, expect } from 'vitest';
import GameEngineShared, { GameEngine } from '../../components/GameEngine';
import { GameStatus, MarketPosition } from '../../types';
import { GameMode } from '../../types/gameMode';

describe('GameEngine freshness', () => {
  it('exports main and shared components', () => {
    expect(GameEngine).toBeDefined();
    expect(GameEngineShared).toBeDefined();
  });
});

describe('GameEngineShared memo comparator', () => {
  // Access the comparator from the memo wrapper
  // React.memo stores the comparator as .compare on the memo object
  const memoComparator = (
    GameEngineShared as unknown as {
      compare: (a: Record<string, unknown>, b: Record<string, unknown>) => boolean;
    }
  ).compare;

  const baseProps = {
    status: GameStatus.PLAYING,
    width: 800,
    height: 600,
    position: MarketPosition.LONG,
    pair: 'BTC' as const,
    playerRef: { current: null },
    gameMode: GameMode.COMPETITIVE,
    marketData: { price: 100 },
    onGameOver: () => {},
    onLevelUp: () => {},
    updatePlayerStats: () => {},
  };

  it('comparator exists on GameEngineShared', () => {
    expect(memoComparator).toBeTypeOf('function');
  });

  it('returns true (skip re-render) when stable props are same', () => {
    expect(memoComparator(baseProps, baseProps)).toBe(true);
  });

  it('returns false (re-render) when status changes', () => {
    expect(memoComparator(baseProps, { ...baseProps, status: GameStatus.PAUSED })).toBe(
      false
    );
  });

  it('returns false when width changes', () => {
    expect(memoComparator(baseProps, { ...baseProps, width: 1024 })).toBe(false);
  });

  it('returns false when height changes', () => {
    expect(memoComparator(baseProps, { ...baseProps, height: 768 })).toBe(false);
  });

  it('returns false when position changes', () => {
    expect(
      memoComparator(baseProps, { ...baseProps, position: MarketPosition.SHORT })
    ).toBe(false);
  });

  it('returns false when gameMode changes', () => {
    expect(memoComparator(baseProps, { ...baseProps, gameMode: GameMode.CASUAL })).toBe(
      false
    );
  });

  it('returns true even when marketData changes (intentionally excluded)', () => {
    expect(
      memoComparator(baseProps, { ...baseProps, marketData: { price: 999 } })
    ).toBe(true);
  });

  it('returns true even when callback references change (intentionally excluded)', () => {
    expect(
      memoComparator(baseProps, {
        ...baseProps,
        onGameOver: () => {},
        onLevelUp: () => {},
        updatePlayerStats: () => {},
      })
    ).toBe(true);
  });
});
