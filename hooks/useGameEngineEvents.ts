import { useEffect } from 'react';
import { EventBus } from '../services/core/EventBus';
import { type MarketData, type MarketPosition, type GameState } from '../types';
import { GAME_ENGINE } from '../constants';
import { audio } from '../services/audio';
import { PriceMomentumEngine } from '../services/market/PriceMomentumEngine';
import { MarketEventAnnouncer } from '../services/market/MarketEventAnnouncer';
import { type HitStopGovernor } from '../services/gameplay/HitStopGovernor';

interface UseGameEngineEventsParams {
  stateRef: React.RefObject<GameState>;
  marketDataRef: React.RefObject<MarketData>;
  hitStopGovernorRef: React.RefObject<HitStopGovernor>;
  position: MarketPosition;
}

/**
 * Extracted EventBus listeners from GameEngine.
 * Handles: hitStop, gameMarketUpdate, nearMiss events.
 *
 * NOTE: weaponFired projectile spawning has been moved to the service layer
 * (WeaponSystem → WeaponFiringPipeline). The weaponFired event is now only
 * used for audio/UI feedback, which is handled directly in useGameEngineEvents
 * via a lightweight listener.
 *
 * All listeners are cleaned up on unmount.
 */
export function useGameEngineEvents({
  stateRef,
  marketDataRef,
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

  // weaponFired audio feedback — laser fires frequently so skip shoot sound for it
  useEffect(() => {
    const unsub = EventBus.on('weaponFired', data => {
      // Skip audio for very-fast-firing weapons to prevent sound overlap
      if (data.weaponId === 'laser') return;
      audio.playShoot(0.6, 1);
    });
    return unsub;
  }, []);
}
