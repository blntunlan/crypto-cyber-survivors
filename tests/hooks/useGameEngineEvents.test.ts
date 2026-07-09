import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameEngineEvents } from '../../hooks/useGameEngineEvents';
import { EventBus } from '../../services/core/EventBus';
import { TimeService } from '../../services/core/TimeService';
import { type HitStopGovernor } from '../../services/gameplay/HitStopGovernor';
import {
  type GameState,
  type MarketData,
  MarketPosition,
  GameStatus,
} from '../../types';

vi.mock('../../services/audio', () => ({
  audio: { playWhoosh: vi.fn(), playWeaponFire: vi.fn() },
}));

vi.mock('../../services/market/PriceMomentumEngine', () => ({
  PriceMomentumEngine: { update: vi.fn() },
}));

vi.mock('../../services/market/MarketEventAnnouncer', () => ({
  MarketEventAnnouncer: { update: vi.fn() },
}));

describe('useGameEngineEvents', () => {
  const makeRefs = () => {
    const stateRef = {
      current: {
        hitStopTimer: 0,
        nearMissCooldown: 0,
        nearMissTimer: 0,
      } as GameState,
    };
    const marketDataRef = { current: {} as MarketData };
    const hitStopGovernorRef = {
      current: {
        getAdjustedDuration: vi.fn(() => 50),
      } as unknown as HitStopGovernor,
    };

    return {
      stateRef,
      marketDataRef,
      hitStopGovernorRef,
      position: MarketPosition.LONG,
      status: GameStatus.PLAYING,
    };
  };

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

  it('passes pause-aware game time to the hit-stop governor', () => {
    const refs = makeRefs();
    vi.spyOn(TimeService, 'getGameTime').mockReturnValue(4321);
    renderHook(() => useGameEngineEvents(refs));

    const event = {
      duration: 50,
      isCrit: false,
    };
    EventBus.emit('hitStop', event);

    expect(refs.hitStopGovernorRef.current.getAdjustedDuration).toHaveBeenCalledWith(
      event,
      4321
    );
  });

  it('leaves the active hit-stop timer unchanged when the governor skips an event', () => {
    const refs = makeRefs();
    refs.stateRef.current.hitStopTimer = 20;
    vi.mocked(refs.hitStopGovernorRef.current.getAdjustedDuration).mockReturnValue(0);
    renderHook(() => useGameEngineEvents(refs));

    EventBus.emit('hitStop', {
      duration: 50,
      isCrit: true,
    });

    expect(refs.stateRef.current.hitStopTimer).toBe(20);
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

    EventBus.emit('nearMiss', { enemyType: 'basic' });

    expect(audio.playWhoosh).toHaveBeenCalledTimes(1);
  });

  it('weaponFired event triggers weapon-aware audio feedback', async () => {
    const { audio } = await import('../../services/audio');
    const refs = makeRefs();
    renderHook(() => useGameEngineEvents(refs));

    EventBus.emit('weaponFired', {
      weaponId: 'spread_shot',
      x: 0,
      y: 0,
      damage: 10,
    });

    expect(audio.playWeaponFire).toHaveBeenCalledWith('spread_shot', undefined);
  });

  it('weaponFired event routes laser to weapon-aware audio feedback', async () => {
    const { audio } = await import('../../services/audio');
    const refs = makeRefs();
    renderHook(() => useGameEngineEvents(refs));

    EventBus.emit('weaponFired', {
      weaponId: 'laser',
      x: 0,
      y: 0,
      damage: 10,
    });

    expect(audio.playWeaponFire).toHaveBeenCalledWith('laser', undefined);
  });

  it('cleans up subscriptions on unmount', () => {
    const refs = makeRefs();
    const { unmount } = renderHook(() => useGameEngineEvents(refs));

    unmount();

    // After unmount, events should not trigger handlers
    const spy = vi.spyOn(refs.hitStopGovernorRef.current, 'getAdjustedDuration');
    EventBus.emit('hitStop', {
      duration: 50,
      isCrit: false,
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
