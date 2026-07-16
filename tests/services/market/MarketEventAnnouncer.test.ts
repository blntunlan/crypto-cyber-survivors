import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketPosition, type MarketData } from '../../../types';
import { type MarketAnnouncementEvent } from '../../../types/events';
import { EventBus } from '../../../services/core/EventBus';
import { MarketEventAnnouncer } from '../../../services/market/MarketEventAnnouncer';

const createMarketData = (rsiState: string, rsi: number): MarketData => ({
  price: 100_000,
  volume: 1,
  pnl: 0,
  effectivePnl: 0,
  leverage: 1,
  rsi,
  rsiState,
  difficulty: 1,
  momentum: 0,
});

describe('MarketEventAnnouncer alignment events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    MarketEventAnnouncer.reset();
  });

  afterEach(() => {
    MarketEventAnnouncer.reset();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const getMarketEvents = (
    emitSpy: ReturnType<typeof vi.spyOn>
  ): MarketAnnouncementEvent[] => {
    const emitCalls = emitSpy.mock.calls as unknown as Array<
      [event: string, payload: unknown]
    >;

    return emitCalls
      .filter(([event]) => event === 'marketAnnouncement')
      .map(([, payload]) => payload as MarketAnnouncementEvent);
  };

  it('emits one concise event when LONG becomes aligned', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');

    MarketEventAnnouncer.update(createMarketData('OVERSOLD', 18), MarketPosition.LONG);

    expect(getMarketEvents(emitSpy)).toEqual([
      expect.objectContaining({
        type: 'FAVORABLE_MARKET',
        message: 'LONG EDGE // BULL SIGNAL LOCKED',
        icon: '▲',
        duration: 1800,
      }),
    ]);
  });

  it('does not repeat while the market remains aligned', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');
    const alignedMarket = createMarketData('OVERSOLD', 18);

    MarketEventAnnouncer.update(alignedMarket, MarketPosition.LONG);
    vi.advanceTimersByTime(15_000);
    MarketEventAnnouncer.update(alignedMarket, MarketPosition.LONG);

    expect(getMarketEvents(emitSpy)).toHaveLength(1);
  });

  it('emits again after alignment is lost and regained', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');

    MarketEventAnnouncer.update(createMarketData('OVERSOLD', 18), MarketPosition.LONG);
    MarketEventAnnouncer.update(createMarketData('NEUTRAL', 50), MarketPosition.LONG);
    vi.advanceTimersByTime(10_001);
    MarketEventAnnouncer.update(createMarketData('OVERSOLD', 19), MarketPosition.LONG);

    expect(
      getMarketEvents(emitSpy).filter(event => event.type === 'FAVORABLE_MARKET')
    ).toHaveLength(2);
  });

  it('uses a bearish combat signal when SHORT becomes aligned', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');

    MarketEventAnnouncer.update(
      createMarketData('OVERBOUGHT', 82),
      MarketPosition.SHORT
    );

    expect(getMarketEvents(emitSpy)).toEqual([
      expect.objectContaining({
        type: 'FAVORABLE_MARKET',
        message: 'SHORT EDGE // BEAR SIGNAL LOCKED',
        icon: '▼',
        duration: 1800,
      }),
    ]);
  });
});
