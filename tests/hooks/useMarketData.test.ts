import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMarketData } from '../../hooks/useMarketData';
import { GameStatus, MarketPosition, Player } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedCallback: any;

vi.mock('../../services/marketService', () => {
    return {
        MarketService: vi.fn().mockImplementation(function (onData) {
            capturedCallback = onData;
            return {
                connect: vi.fn(),
                disconnect: vi.fn(),
            };
        })
    };
});

describe('useMarketData', () => {
    const mockPlayerRef = {
        current: {
            hp: 100,
            maxHp: 100,
            level: 1,
        }
    } as React.MutableRefObject<Player>;

    beforeEach(() => {
        vi.clearAllMocks();
        capturedCallback = null;
    });

    it('should initialize with default market data', () => {
        const { result } = renderHook(() =>
            useMarketData(GameStatus.MENU, MarketPosition.LONG, 0, mockPlayerRef)
        );

        expect(result.current.marketData.price).toBe(0);
        expect(result.current.marketData.difficulty).toBe(1);
    });

    it('should update price when in MENU status', () => {
        const { result } = renderHook(() =>
            useMarketData(GameStatus.MENU, MarketPosition.LONG, 0, mockPlayerRef)
        );

        act(() => {
            capturedCallback({ price: 50000, source: 'binance' });
        });

        expect(result.current.marketData.price).toBe(50000);
    });

    it('should calculate PNL when in PLAYING status', () => {
        const { result } = renderHook(() =>
            useMarketData(GameStatus.PLAYING, MarketPosition.LONG, 40000, mockPlayerRef)
        );

        act(() => {
            capturedCallback({ price: 44000, source: 'binance' });
        });

        // (44000 - 40000) / 40000 = 4000 / 40000 = 0.1
        expect(result.current.marketData.pnl).toBe(0.1);
        expect(result.current.marketData.price).toBe(44000);
    });

    it('should calculate inverse PNL for SHORT position', () => {
        const { result } = renderHook(() =>
            useMarketData(GameStatus.PLAYING, MarketPosition.SHORT, 40000, mockPlayerRef)
        );

        act(() => {
            capturedCallback({ price: 36000, source: 'binance' });
        });

        // -(36000 - 40000) / 40000 = -(-4000) / 40000 = 0.1
        expect(result.current.marketData.pnl).toBe(0.1);
    });

    it('should record price history', async () => {
        const { result } = renderHook(() =>
            useMarketData(GameStatus.MENU, MarketPosition.LONG, 0, mockPlayerRef)
        );

        act(() => {
            capturedCallback({ price: 100, source: 'binance' });
        });
        act(() => {
            capturedCallback({ price: 200, source: 'binance' });
        });

        expect(result.current.priceHistory).toContain(100);
        expect(result.current.priceHistory).toContain(200);
    });
});
