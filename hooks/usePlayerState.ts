import { useState, useRef, useCallback } from 'react';
import { Player, MarketPosition } from '../types';
import { COLORS, PLAYER_INITIAL_HP, INITIAL_FIRE_RATE } from '../constants';

export const usePlayerState = (width: number, height: number) => {
    const playerRef = useRef<Player>({
        x: width / 2,
        y: height / 2,
        radius: 12,
        color: COLORS.ELECTRIC_BLUE,
        hp: PLAYER_INITIAL_HP,
        maxHp: PLAYER_INITIAL_HP,
        level: 1,
        exp: 0,
        nextLevelExp: 100,
        speed: 4,
        fireRate: INITIAL_FIRE_RATE,
        critChance: 0.05,
        baseDamage: 25,
        luck: 0,
        magnet: 0,
        armor: 0,
        area: 1,
        projectiles: 1,
    });

    const [uiStats, setUiStats] = useState<Player>(playerRef.current);

    const resetPlayer = useCallback(() => {
        Object.assign(playerRef.current, {
            x: width / 2,
            y: height / 2,
            radius: 12,
            color: COLORS.ELECTRIC_BLUE,
            hp: PLAYER_INITIAL_HP,
            maxHp: PLAYER_INITIAL_HP,
            level: 1,
            exp: 0,
            nextLevelExp: 100,
            speed: 4,
            fireRate: INITIAL_FIRE_RATE,
            critChance: 0.05,
            baseDamage: 25,
            luck: 0,
            magnet: 0,
            armor: 0,
            area: 1,
            projectiles: 1,
        });
        setUiStats({ ...playerRef.current });
    }, [width, height]);

    const healFull = useCallback(() => {
        playerRef.current.hp = playerRef.current.maxHp;
        setUiStats({ ...playerRef.current });
    }, []);

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
