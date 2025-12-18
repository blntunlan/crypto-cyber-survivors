import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePlayerState } from '../../hooks/usePlayerState';
import { PLAYER_INITIAL_HP, INITIAL_FIRE_RATE } from '../../constants';
import { MarketPosition } from '../../types';

describe('usePlayerState', () => {
    it('should initialize with default player stats', () => {
        const { result } = renderHook(() => usePlayerState(800, 600));

        expect(result.current.uiStats.hp).toBe(PLAYER_INITIAL_HP);
        expect(result.current.uiStats.level).toBe(1);
        expect(result.current.uiStats.fireRate).toBe(INITIAL_FIRE_RATE);
        expect(result.current.playerRef.current.x).toBe(400);
        expect(result.current.playerRef.current.y).toBe(300);
    });

    it('should reset player stats correctly', () => {
        const { result } = renderHook(() => usePlayerState(800, 600));

        act(() => {
            result.current.playerRef.current.hp = 50;
            result.current.playerRef.current.level = 10;
            result.current.resetPlayer();
        });

        expect(result.current.uiStats.hp).toBe(PLAYER_INITIAL_HP);
        expect(result.current.uiStats.level).toBe(1);
    });

    it('should heal player to full', () => {
        const { result } = renderHook(() => usePlayerState(800, 600));

        act(() => {
            result.current.playerRef.current.hp = 10;
            result.current.healFull();
        });

        expect(result.current.uiStats.hp).toBe(PLAYER_INITIAL_HP);
        expect(result.current.playerRef.current.hp).toBe(PLAYER_INITIAL_HP);
    });

    it('should change color based on position', () => {
        const { result } = renderHook(() => usePlayerState(800, 600));

        act(() => {
            result.current.setPositionColor(MarketPosition.LONG);
        });
        expect(result.current.uiStats.color).toBe('#22c55e');

        act(() => {
            result.current.setPositionColor(MarketPosition.SHORT);
        });
        expect(result.current.uiStats.color).toBe('#ef4444');
    });
});
