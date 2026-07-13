import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  emit: vi.fn(),
  setPresentationAmbience: vi.fn(),
  playSlowdownTension: vi.fn(),
  playWhoosh: vi.fn(),
  playAchievementGlint: vi.fn(),
  playPairSelect: vi.fn(),
}));

vi.mock('../../../services/core/EventBus', () => ({
  EventBus: { emit: mocks.emit },
}));

vi.mock('../../../services/audio', () => ({
  audio: {
    playSlowdownTension: mocks.playSlowdownTension,
    playWhoosh: mocks.playWhoosh,
    playAchievementGlint: mocks.playAchievementGlint,
    playPairSelect: mocks.playPairSelect,
  },
}));

vi.mock('../../../services/audio/MarketAudioReactor', () => ({
  MarketAudioReactor: { setPresentationAmbience: mocks.setPresentationAmbience },
}));

import { createGamePresentationCueAdapter } from '../../../services/presentation/GamePresentationCueAdapter';
import { type PresentationSnapshot } from '../../../services/presentation/PresentationDirector';

const snapshot: PresentationSnapshot = {
  isEnabled: true,
  ambience: {
    favorable: 0.6,
    volatility: 0.7,
    bpm: 132,
    liquidationTension: 0.4,
  },
  sensory: { shake: 0.2, flash: 0.3, hitStop: 0, audioAccent: 0.8 },
  cues: [
    { type: 'ENCOUNTER_TELEGRAPH', intensity: 0.7, tick: 10 },
    { type: 'ENCOUNTER_ACTIVE', intensity: 0.8, tick: 11 },
    { type: 'MARKET_RECONNECTED', intensity: 0.6, tick: 12 },
    { type: 'SAFE_EXIT_AVAILABLE', intensity: 0.5, tick: 13 },
  ],
};

describe('GamePresentationCueAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes presentation data to HUD, VFX, and audio without gameplay calls', () => {
    createGamePresentationCueAdapter().apply(snapshot);

    expect(mocks.setPresentationAmbience).toHaveBeenCalledWith(snapshot.ambience);
    expect(mocks.emit).toHaveBeenCalledWith('visualOverlay', {
      effect: 'red_flash',
      intensity: snapshot.sensory.flash,
      durationMs: 250,
    });
    expect(mocks.emit).toHaveBeenCalledWith(
      'gameNotification',
      expect.objectContaining({ title: 'MARKET SIGNAL' })
    );
    expect(mocks.playSlowdownTension).toHaveBeenCalledOnce();
    expect(mocks.playWhoosh).not.toHaveBeenCalled();
    expect(mocks.playAchievementGlint).not.toHaveBeenCalled();
    expect(mocks.playPairSelect).not.toHaveBeenCalled();
  });
});
