import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  PresentationDirector,
  type PresentationInput,
} from '../../../services/presentation/PresentationDirector';
import { PresentationCueAdapter } from '../../../services/presentation/PresentationCueAdapter';
import { EventBusPresentationCueAdapter } from '../../../services/presentation/EventBusPresentationCueAdapter';
import { createGameplaySnapshotHash } from '../../../services/director/ExperienceDirector';

const createInput = (
  overrides: Partial<PresentationInput> = {}
): PresentationInput => ({
  deltaSeconds: 0.25,
  tick: 10,
  gameplay: {
    revision: 1,
    validFromTick: 10,
    pacing: { state: 'PEAK', threatMultiplier: 1.25, remainingSeconds: 20 },
    threat: { target: 1.2, creditRate: 1, availableCredits: 2, maximumCredits: 8 },
    advantage: {
      creditRate: 0,
      availableCredits: 0,
      maximumCredits: 0,
      activeMechanic: null,
    },
    environment: {
      regime: 'VOLATILE',
      presentationIntensity: 0.8,
      isFavorable: false,
    },
    encounter: {
      activeEventFamily: 'VOLUME_SURGE',
      canStartMarketSurge: true,
      queuedEventFamily: null,
      phase: 'TELEGRAPH',
      primaryCardId: 'VOLUME_DENSE_WAVE',
      supportCardId: null,
      headwindChannels: ['SPAWN_DENSITY'],
    },
  },
  alignment: -0.4,
  volatility: 0.8,
  suggestedBpm: 128,
  liquidationTension: 0.3,
  accessibilityIntensity: 1,
  marketStatus: 'LIVE',
  safeExitAvailable: false,
  ...overrides,
});

describe('PresentationDirector', () => {
  it('keeps direct spawn and player-modifier side effects out of the market mapper', () => {
    const source = readFileSync('services/market/MarketEventMapperV2.ts', 'utf8');

    expect(source).not.toContain("EventBus.emit('spawnBoss'");
    expect(source).not.toContain("EventBus.emit('playerModifierApplied'");
    expect(source).not.toContain("EventBus.emit('marketFlowInfluence'");
  });

  it('requires a telegraph before publishing an active encounter cue', () => {
    const director = new PresentationDirector();
    const telegraph = director.update(createInput());
    const active = director.update(
      createInput({
        tick: 11,
        gameplay: {
          ...createInput().gameplay,
          validFromTick: 11,
          encounter: {
            ...createInput().gameplay.encounter,
            phase: 'ACTIVE',
          },
        },
      })
    );

    expect(telegraph.cues.map(cue => cue.type)).toContain('ENCOUNTER_TELEGRAPH');
    expect(active.cues.map(cue => cue.type)).toContain('ENCOUNTER_ACTIVE');
  });

  it('caps sensory requests and rate-limits duplicate cues', () => {
    const director = new PresentationDirector();
    const first = director.update(createInput({ liquidationTension: 1 }));
    const repeated = director.update(createInput({ tick: 11, liquidationTension: 1 }));

    expect(
      first.sensory.shake +
        first.sensory.flash +
        first.sensory.hitStop +
        first.sensory.audioAccent
    ).toBeLessThanOrEqual(1);
    expect(repeated.cues).toEqual([]);
  });

  it('keeps gameplay bytes unchanged when presentation is disabled', () => {
    const director = new PresentationDirector();
    const input = createInput({ accessibilityIntensity: 0 });
    const hashBefore = createGameplaySnapshotHash(input.gameplay);

    const presentation = director.update(input);

    expect(presentation.isEnabled).toBe(false);
    expect(createGameplaySnapshotHash(input.gameplay)).toBe(hashBefore);
  });

  it('reports stale, reconnect, and safe-exit presentation states without market gameplay effects', () => {
    const director = new PresentationDirector();
    const stale = director.update(createInput({ marketStatus: 'STALE' }));
    const reconnect = director.update(createInput({ tick: 11, marketStatus: 'LIVE' }));
    const safeExit = director.update(
      createInput({ tick: 12, marketStatus: 'STALE', safeExitAvailable: true })
    );

    expect(stale.cues.map(cue => cue.type)).toContain('MARKET_STALE');
    expect(reconnect.cues.map(cue => cue.type)).toContain('MARKET_RECONNECTED');
    expect(safeExit.cues.map(cue => cue.type)).toContain('SAFE_EXIT_AVAILABLE');
  });

  it('adapts presentation-only ambience, cue, and sensory data without gameplay callbacks', () => {
    const ambience = vi.fn();
    const cue = vi.fn();
    const sensory = vi.fn();
    const snapshot = new PresentationDirector().update(createInput());

    new PresentationCueAdapter({
      applyAmbience: ambience,
      emitCue: cue,
      applySensory: sensory,
    }).apply(snapshot);

    expect(ambience).toHaveBeenCalledWith(snapshot.ambience);
    expect(sensory).toHaveBeenCalledWith(snapshot.sensory);
    expect(cue).toHaveBeenCalledTimes(snapshot.cues.length);
  });

  it('routes concrete cues to presentation-only HUD, VFX, and audio targets', () => {
    const notification = vi.fn();
    const overlay = vi.fn();
    const accent = vi.fn();
    const ambience = vi.fn();
    const adapter = new EventBusPresentationCueAdapter({
      notify: notification,
      overlay,
      playAccent: accent,
      setAmbience: ambience,
    });
    const snapshot = new PresentationDirector().update(createInput());

    adapter.apply(snapshot);

    expect(ambience).toHaveBeenCalledWith(snapshot.ambience);
    expect(notification).toHaveBeenCalledTimes(snapshot.cues.length);
    expect(overlay).toHaveBeenCalled();
    expect(accent).toHaveBeenCalled();
  });
});
