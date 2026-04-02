import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameEngineEvents } from '../../hooks/useGameEngineEvents';
import { EventBus } from '../../services/core/EventBus';
import { type MarketData, MarketPosition } from '../../types';

vi.mock('../../services/audio', () => ({
  audio: { playWhoosh: vi.fn() },
}));

vi.mock('../../services/market/PriceMomentumEngine', () => ({
  PriceMomentumEngine: { update: vi.fn() },
}));

vi.mock('../../services/market/MarketEventAnnouncer', () => ({
  MarketEventAnnouncer: { update: vi.fn() },
}));

vi.mock('../../config/WeaponRegistry', () => ({
  WEAPON_REGISTRY: {
    pistol: {
      id: 'pistol',
      projectileCount: 1,
      projectileSpeed: 10,
      projectileRadius: 4,
    },
    laser: {
      id: 'laser',
      projectileCount: 1,
      projectileSpeed: 10,
      projectileRadius: 4,
    },
  },
}));

describe('useGameEngineEvents', () => {
  const makeRefs = () => ({
    stateRef: {
      current: {
        hitStopTimer: 0,
        nearMissCooldown: 0,
        nearMissTimer: 0,
      },
    } as never,
    marketDataRef: { current: {} as MarketData },
    poolRef: {
      current: {
        activeEnemies: [],
        getBullet: vi.fn(),
      },
    } as never,
    hitStopGovernorRef: {
      current: {
        getAdjustedDuration: vi.fn(() => 50),
      },
    } as never,
    position: MarketPosition.LONG,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    EventBus.clearEvent('hitStop');
    EventBus.clearEvent('gameMarketUpdate');
    EventBus.clearEvent('nearMiss');
    EventBus.clearEvent('weaponFired');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('subscribes to hitStop events', () => {
    const refs = makeRefs();
    renderHook(() => useGameEngineEvents(refs));

    EventBus.emit('hitStop', {
      type: 'bullet',
      damage: 10,
      isCritical: false,
      enemyType: 'basic',
    });

    expect(refs.hitStopGovernorRef.current.getAdjustedDuration).toHaveBeenCalled();
  });

  it('subscribes to gameMarketUpdate events and updates marketDataRef', () => {
    const refs = makeRefs();
    renderHook(() => useGameEngineEvents(refs));

    const mockData = { price: 50000, volume: 100 } as MarketData;
    EventBus.emit('gameMarketUpdate', mockData);

    expect(refs.marketDataRef.current).toBe(mockData);
  });

  it('subscribes to nearMiss events', async () => {
    const { audio } = await import('../../services/audio');
    const refs = makeRefs();
    renderHook(() => useGameEngineEvents(refs));

    EventBus.emit('nearMiss', {});

    expect(audio.playWhoosh).toHaveBeenCalledTimes(1);
  });

  it('skips laser weapon type in weaponFired', () => {
    const refs = makeRefs();
    renderHook(() => useGameEngineEvents(refs));

    EventBus.emit('weaponFired', {
      weaponId: 'laser',
      x: 0,
      y: 0,
      damage: 10,
    });

    expect(refs.poolRef.current.getBullet).not.toHaveBeenCalled();
  });

  it('cleans up subscriptions on unmount', () => {
    const refs = makeRefs();
    const { unmount } = renderHook(() => useGameEngineEvents(refs));

    unmount();

    // After unmount, events should not trigger handlers
    const spy = vi.spyOn(refs.hitStopGovernorRef.current, 'getAdjustedDuration');
    EventBus.emit('hitStop', {
      type: 'bullet',
      damage: 10,
      isCritical: false,
      enemyType: 'basic',
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
