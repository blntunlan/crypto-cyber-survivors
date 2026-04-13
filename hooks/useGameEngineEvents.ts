import { useEffect } from 'react';
import { EventBus } from '../services/core/EventBus';
import { type MarketData, type MarketPosition } from '../types';
import { type GameState } from '../types/gameState';
import { COLORS, GAME_ENGINE } from '../constants';
import { WEAPON_REGISTRY } from '../config/WeaponRegistry';
import { type WeaponId } from '../types/weapons';
import { audio } from '../services/audio';
import { PriceMomentumEngine } from '../services/market/PriceMomentumEngine';
import { MarketEventAnnouncer } from '../services/market/MarketEventAnnouncer';
import { type HitStopGovernor } from '../services/gameplay/HitStopGovernor';
import { type PoolManager } from '../services/combat/PoolManager';

interface UseGameEngineEventsParams {
  stateRef: React.RefObject<GameState>;
  marketDataRef: React.RefObject<MarketData>;
  poolRef: React.RefObject<PoolManager>;
  hitStopGovernorRef: React.RefObject<HitStopGovernor>;
  position: MarketPosition;
}

/**
 * Extracted EventBus listeners from GameEngine.
 * Handles: hitStop, gameMarketUpdate, nearMiss, weaponFired events.
 * All listeners are cleaned up on unmount.
 */
export function useGameEngineEvents({
  stateRef,
  marketDataRef,
  poolRef,
  hitStopGovernorRef,
  position,
}: UseGameEngineEventsParams): void {
  // Hit Stop Event Listener (freeze frame on impact)
  useEffect(() => {
    const unsubscribe = EventBus.on('hitStop', data => {
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const adjustedDuration = hitStopGovernorRef.current.getAdjustedDuration(
        data,
        nowMs
      );

      if (adjustedDuration <= 0) return;

      stateRef.current.hitStopTimer = Math.min(
        GAME_ENGINE.HIT_STOP_CHAIN_CAP_MS,
        Math.max(stateRef.current.hitStopTimer, adjustedDuration)
      );
    });

    return unsubscribe;
  }, [hitStopGovernorRef, stateRef]);

  // Listen for high-frequency market updates directly to avoid React re-render overhead
  useEffect(() => {
    let lastAnnouncerUpdate = 0;
    const ANNOUNCER_THROTTLE_MS = 500;

    const unsub = EventBus.on('gameMarketUpdate', (data: MarketData) => {
      marketDataRef.current = data;

      if (data.price > 0) {
        PriceMomentumEngine.update(data.price, Date.now());
      }

      const now = Date.now();
      if (now - lastAnnouncerUpdate >= ANNOUNCER_THROTTLE_MS) {
        lastAnnouncerUpdate = now;
        MarketEventAnnouncer.update(data, position);
      }
    });
    return unsub;
  }, [position, marketDataRef]);

  // Near Miss Event Listener (Matrix slow-mo effect)
  useEffect(() => {
    const unsubscribe = EventBus.on('nearMiss', () => {
      if (stateRef.current.nearMissCooldown <= 0) {
        stateRef.current.nearMissTimer = GAME_ENGINE.NEAR_MISS_DURATION;
        stateRef.current.nearMissCooldown = GAME_ENGINE.NEAR_MISS_COOLDOWN;
        audio.playWhoosh();
      }
    });
    return unsubscribe;
  }, [stateRef]);

  // Spawn projectiles when weapons fire
  useEffect(() => {
    const unsub = EventBus.on('weaponFired', data => {
      const cfg = WEAPON_REGISTRY[data.weaponId as WeaponId];
      const poolManager = poolRef.current;

      // Orbit Shield: burst projectiles in all directions (no target needed)
      if (cfg.id === 'orbit_shield') {
        const count = cfg.projectileCount + (data.level - 1);
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const vx = Math.cos(angle) * cfg.projectileSpeed;
          const vy = Math.sin(angle) * cfg.projectileSpeed;
          poolManager.getBullet(
            data.x,
            data.y,
            vx,
            vy,
            data.damage,
            cfg.projectileRadius,
            '#44ddff',
            false,
            false
          );
        }
        return;
      }

      // All other weapons need a target enemy
      const enemies = poolManager.activeEnemies;
      let bestX = 0;
      let bestY = 0;
      let bestDistSq = Infinity;
      let found = false;

      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i]!;
        if (enemy.isDying || !enemy.active) continue;
        const dx = enemy.x - data.x;
        const dy = enemy.y - data.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < bestDistSq) {
          bestX = enemy.x;
          bestY = enemy.y;
          bestDistSq = distSq;
          found = true;
        }
      }

      if (!found) return;

      const baseAngle = Math.atan2(bestY - data.y, bestX - data.x);
      const count = cfg.projectileCount;
      const spreadAngle = 0.15;

      for (let i = 0; i < count; i++) {
        const angleOffset = (i - (count - 1) / 2) * spreadAngle;
        const finalAngle = baseAngle + angleOffset;
        const vx = Math.cos(finalAngle) * cfg.projectileSpeed;
        const vy = Math.sin(finalAngle) * cfg.projectileSpeed;

        poolManager.getBullet(
          data.x,
          data.y,
          vx,
          vy,
          data.damage,
          cfg.projectileRadius,
          COLORS.BULLET,
          false,
          false
        );
      }
    });

    return unsub;
  }, [poolRef]);
}
