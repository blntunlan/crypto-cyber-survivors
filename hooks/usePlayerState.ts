/**
 * usePlayerState - Player State Management Hook
 *
 * Manages player state with centralized defaults from GameStateManager.
 * Provides reset, heal, and color change functionality.
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { Player, MarketPosition } from '../types';
import { COLORS } from '../constants';
import { PLAYER_DEFAULTS } from '../services/GameStateManager';

/**
 * Create a fresh player object with initial values
 */
const createInitialPlayer = (centerX: number, centerY: number): Player => ({
    x: centerX,
    y: centerY,
    radius: PLAYER_DEFAULTS.radius,
    color: COLORS.ELECTRIC_BLUE,
    hp: PLAYER_DEFAULTS.hp,
    maxHp: PLAYER_DEFAULTS.maxHp,
    level: PLAYER_DEFAULTS.level,
    exp: PLAYER_DEFAULTS.exp,
    nextLevelExp: PLAYER_DEFAULTS.nextLevelExp,
    speed: PLAYER_DEFAULTS.speed,
    fireRate: PLAYER_DEFAULTS.fireRate,
    critChance: PLAYER_DEFAULTS.critChance,
    baseDamage: PLAYER_DEFAULTS.baseDamage,
    luck: PLAYER_DEFAULTS.luck,
    magnet: PLAYER_DEFAULTS.magnet,
    armor: PLAYER_DEFAULTS.armor,
    area: PLAYER_DEFAULTS.area,
    projectiles: PLAYER_DEFAULTS.projectiles,
});

export const usePlayerState = (width: number, height: number) => {
    // Memoize initial player to prevent unnecessary recalculations
    const initialPlayer = useMemo(
        () => createInitialPlayer(width / 2, height / 2),
        [width, height]
    );

    const playerRef = useRef<Player>(initialPlayer);
    const [uiStats, setUiStats] = useState<Player>(initialPlayer);

    /**
     * Reset player to initial state
     * Uses factory function to ensure fresh values every time
     */
    const resetPlayer = useCallback(() => {
        const freshPlayer = createInitialPlayer(width / 2, height / 2);
        Object.assign(playerRef.current, freshPlayer);
        setUiStats({ ...playerRef.current });
    }, [width, height]);

    /**
     * Heal player to full HP
     */
    const healFull = useCallback(() => {
        playerRef.current.hp = playerRef.current.maxHp;
        setUiStats({ ...playerRef.current });
    }, []);

    /**
     * Set player color based on market position
     */
    const setPositionColor = useCallback((pos: MarketPosition) => {
        playerRef.current.color = pos === MarketPosition.LONG ? '#22c55e' : '#ef4444';
        setUiStats({ ...playerRef.current });
    }, []);

    return {
        playerRef,
        uiStats,
        setUiStats,
        resetPlayer,
        healFull,
        setPositionColor,
    };
};
