import { audio } from '../audio';
import { MarketAudioReactor } from '../audio/MarketAudioReactor';
import { EventBus } from '../core/EventBus';
import { EventBusPresentationCueAdapter } from './EventBusPresentationCueAdapter';

/** Connects presentation output to existing HUD, VFX, and audio facilities. */
export const createGamePresentationCueAdapter = (): EventBusPresentationCueAdapter =>
  new EventBusPresentationCueAdapter({
    notify: payload => EventBus.emit('gameNotification', payload),
    overlay: payload => EventBus.emit('visualOverlay', payload),
    setAmbience: ambience => MarketAudioReactor.setPresentationAmbience(ambience),
    playAccent: cue => {
      switch (cue.type) {
        case 'ENCOUNTER_TELEGRAPH':
        case 'MARKET_STALE':
          audio.playSlowdownTension();
          return;
        case 'ENCOUNTER_ACTIVE':
          audio.playWhoosh();
          return;
        case 'MARKET_RECONNECTED':
          audio.playAchievementGlint();
          return;
        case 'SAFE_EXIT_AVAILABLE':
          audio.playPairSelect();
      }
    },
  });
