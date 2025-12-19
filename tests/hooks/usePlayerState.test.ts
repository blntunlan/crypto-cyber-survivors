import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePlayerState } from '../../hooks/usePlayerState';
import { PLAYER_DEFAULTS } from '../../services/GameStateManager';
import { MarketPosition } from '../../types';

describe('usePlayerState', () => {
    it('should initialize with default player stats', () => {
        const { result } = renderHook(() => usePlayerState(800, 600));

        expect(result.current.uiStats.hp).toBe(PLAYER_DEFAULTS.hp);
        expect(result.current.uiStats.level).toBe(PLAYER_DEFAULTS.level);
        expect(result.current.uiStats.fireRate).toBe(PLAYER_DEFAULTS.fireRate);
        expect(result.current.playerRef.current.x).toBe(400);
        expect(result.current.playerRef.current.y).toBe(300);
    });

    it('should initialize with correct center position', () => {
        const { result } = renderHook(() => usePlayerState(1920, 1080));

        expect(result.current.playerRef.current.x).toBe(960);
        expect(result.current.playerRef.current.y).toBe(540);
    });

    it('should reset player stats correctly', () => {
        const { result } = renderHook(() => usePlayerState(800, 600));

        act(() => {
            result.current.playerRef.current.hp = 50;
            result.current.playerRef.current.level = 10;
            result.current.playerRef.current.baseDamage = 100;
            result.current.resetPlayer();
        });

        expect(result.current.uiStats.hp).toBe(PLAYER_DEFAULTS.hp);
        expect(result.current.uiStats.level).toBe(PLAYER_DEFAULTS.level);
        expect(result.current.uiStats.baseDamage).toBe(PLAYER_DEFAULTS.baseDamage);
    });

    it('should reset position on resetPlayer', () => {
        const { result } = renderHook(() => usePlayerState(800, 600));

        act(() => {
            result.current.playerRef.current.x = 100;
            result.current.playerRef.current.y = 100;
            result.current.resetPlayer();
        });

        expect(result.current.playerRef.current.x).toBe(400);
        expect(result.current.playerRef.current.y).toBe(300);
    });

    it('should heal player to full', () => {
        const { result } = renderHook(() => usePlayerState(800, 600));

        act(() => {
            result.current.playerRef.current.hp = 10;
            result.current.healFull();
        });

        expect(result.current.uiStats.hp).toBe(PLAYER_DEFAULTS.hp);
        expect(result.current.playerRef.current.hp).toBe(PLAYER_DEFAULTS.hp);
    });

    it('should heal to current maxHp, not default', () => {
        const { result } = renderHook(() => usePlayerState(800, 600));

        act(() => {
            // Simulate leveled up player with more HP
            result.current.playerRef.current.maxHp = 150;
            result.current.playerRef.current.hp = 10;
            result.current.healFull();
        });

        expect(result.current.playerRef.current.hp).toBe(150);
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

    it('should sync uiStats with playerRef on reset', () => {
        const { result } = renderHook(() => usePlayerState(800, 600));

        act(() => {
            result.current.playerRef.current.exp = 500;
            result.current.resetPlayer();
        });

        expect(result.current.uiStats.exp).toBe(PLAYER_DEFAULTS.exp);
        expect(result.current.playerRef.current.exp).toBe(PLAYER_DEFAULTS.exp);
    });
});
