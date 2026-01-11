import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMarketData } from '../../hooks/useMarketData';
import { GameStatus, MarketPosition, type Player } from '../../types';

// Use vi.hoisted to share state between mock factory and tests
const { callbackRef } = vi.hoisted(() => ({
  callbackRef: { current: null as any },
}));

vi.mock('../../services/marketService', () => {
  return {
    MarketService: class MockMarketService {
      constructor(config: any) {
        callbackRef.current = (data: any) => {
          // Ensure pair is always included in the callback data
          config.onData({ ...data, pair: config.pair });
        };
      }
      connect() {
        // connect simulation
      }
      disconnect() {
        // cleanup simulation
      }
      destroy() {
        // full cleanup simulation
      }
    },
  };
});

describe('useMarketData', () => {
  const mockPlayerRef = {
    current: {
      hp: 100,
      maxHp: 100,
      level: 1,
    },
  } as React.RefObject<Player>;

  beforeEach(() => {
    vi.clearAllMocks();
    callbackRef.current = null;
  });

  it('should initialize with default market data', () => {
    const { result } = renderHook(() =>
      useMarketData(GameStatus.MENU, MarketPosition.LONG, 0, 1, mockPlayerRef, 'BTC')
    );

    expect(result.current.marketData.price).toBe(0);
    expect(result.current.marketData.difficulty).toBe(1);
    expect(result.current.marketData.pair).toBe('BTC');
  });

  it('should update price when in MENU status', () => {
    const { result } = renderHook(() =>
      useMarketData(GameStatus.MENU, MarketPosition.LONG, 0, 1, mockPlayerRef, 'BTC')
    );

    act(() => {
      if (callbackRef.current) {
        callbackRef.current({ price: 50000, source: 'binance' });
      }
    });

    expect(result.current.marketData.price).toBe(50000);
  });

  it('should calculate PNL when in PLAYING status', () => {
    const { result } = renderHook(() =>
      useMarketData(
        GameStatus.PLAYING,
        MarketPosition.LONG,
        40000,
        1,
        mockPlayerRef,
        'BTC'
      )
    );

    act(() => {
      if (callbackRef.current) {
        callbackRef.current({ price: 44000, source: 'binance' });
      }
    });

    // (44000 - 40000) / 40000 = 4000 / 40000 = 0.1
    expect(result.current.marketData.pnl).toBe(0.1);
    expect(result.current.marketData.price).toBe(44000);
  });

  it('should calculate inverse PNL for SHORT position', () => {
    const { result } = renderHook(() =>
      useMarketData(
        GameStatus.PLAYING,
        MarketPosition.SHORT,
        40000,
        1,
        mockPlayerRef,
        'BTC'
      )
    );

    act(() => {
      if (callbackRef.current) {
        callbackRef.current({ price: 36000, source: 'binance' });
      }
    });

    // -(36000 - 40000) / 40000 = -(-4000) / 40000 = 0.1
    expect(result.current.marketData.pnl).toBe(0.1);
  });

  it('should calculate effective PNL with leverage', () => {
    const { result } = renderHook(() =>
      useMarketData(
        GameStatus.PLAYING,
        MarketPosition.LONG,
        40000,
        10,
        mockPlayerRef,
        'BTC'
      )
    );

    act(() => {
      if (callbackRef.current) {
        callbackRef.current({ price: 44000, source: 'binance' });
      }
    });

    // Raw PnL: 0.1, Effective: 0.1 * 10 = 1.0
    expect(result.current.marketData.pnl).toBe(0.1);
    expect(result.current.marketData.effectivePnl).toBe(1.0);
    expect(result.current.marketData.leverage).toBe(10);
  });

  it('should record price history', async () => {
    const { result } = renderHook(() =>
      useMarketData(GameStatus.MENU, MarketPosition.LONG, 0, 1, mockPlayerRef, 'BTC')
    );

    act(() => {
      if (callbackRef.current) {
        callbackRef.current({ price: 100, source: 'binance' });
      }
    });
    act(() => {
      if (callbackRef.current) {
        callbackRef.current({ price: 200, source: 'binance' });
      }
    });

    expect(result.current.priceHistory).toContain(100);
    expect(result.current.priceHistory).toContain(200);
  });

  it('should calculate liquidation price', () => {
    const { result } = renderHook(() =>
      useMarketData(
        GameStatus.PLAYING,
        MarketPosition.LONG,
        40000,
        10,
        mockPlayerRef,
        'BTC'
      )
    );

    act(() => {
      if (callbackRef.current) {
        callbackRef.current({ price: 40000, source: 'binance' });
      }
    });

    // For LONG 10x leverage, liquidation is at -10% price drop.
    // 40000 * (1 - 1/10) = 40000 * 0.9 = 36000
    expect(result.current.marketData.liquidationPrice).toBe(36000);
  });
});
