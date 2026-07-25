import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  PresentationDirector,
  type PresentationInput,
} from '../../../services/presentation/PresentationDirector';
import { PresentationCueAdapter } from '../../../services/presentation/PresentationCueAdapter';
import { EventBusPresentationCueAdapter } from '../../../services/presentation/EventBusPresentationCueAdapter';
import {
  createNeutralRuntimeDifficultySnapshot,
  type RuntimeDifficultySnapshot,
} from '../../../types/runtimeDifficulty';

type SnapshotOverrides = {
  phase?: RuntimeDifficultySnapshot['encounter']['phase'];
  stale?: boolean;
  liquidationProximity?: number;
};

const createSnapshot = (
  overrides: SnapshotOverrides = {}
): RuntimeDifficultySnapshot => {
  const snapshot = structuredClone(
    createNeutralRuntimeDifficultySnapshot({ tick: 10, inputRevision: 1 })
  ) as any;
  snapshot.meta.revision = 1;
  snapshot.meta.validFromTick = 10;
  snapshot.signals.market.regime = 'VOLATILE';
  snapshot.signals.market.volatility = 0.8;
  snapshot.signals.market.reasonCodes = overrides.stale
    ? ['MARKET_STALE']
    : ['MARKET_LIVE'];
  snapshot.signals.position.alignment = -0.4;
  snapshot.signals.position.liquidationProximity =
    overrides.liquidationProximity ?? 0.3;
  snapshot.encounter.family = 'VOLUME_SURGE';
  snapshot.encounter.phase = overrides.phase ?? 'TELEGRAPH';
  snapshot.presentation.intensity = 0.8;
  snapshot.presentation.suggestedBpm = 128;
  snapshot.presentation.shakeLimit = 0.3;
  snapshot.presentation.audioIntensity = 0.8;
  return snapshot as RuntimeDifficultySnapshot;
};

const createInput = (
  overrides: Partial<PresentationInput> = {}
): PresentationInput => ({
  deltaSeconds: 0.25,
  elapsedSeconds: 0.25,
  tick: 10,
  snapshot: createSnapshot(),
  suggestedBpm: 128,
  accessibilityIntensity: 1,
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
        snapshot: createSnapshot({ phase: 'ACTIVE' }),
      })
    );

    expect(telegraph.cues.map(cue => cue.type)).toContain('ENCOUNTER_TELEGRAPH');
    expect(active.cues.map(cue => cue.type)).toContain('ENCOUNTER_ACTIVE');
  });

  it('caps sensory requests and rate-limits duplicate cues', () => {
    const director = new PresentationDirector();
    const first = director.update(
      createInput({ snapshot: createSnapshot({ liquidationProximity: 1 }) })
    );
    const repeated = director.update(
      createInput({
        tick: 11,
        snapshot: createSnapshot({ liquidationProximity: 1 }),
      })
    );

    expect(
      first.sensory.shake +
        first.sensory.flash +
        first.sensory.hitStop +
        first.sensory.audioAccent
    ).toBeLessThanOrEqual(1);
    expect(repeated.cues).toEqual([]);
  });

  it('rate-limits cues by elapsed time instead of render tick distance', () => {
    const director = new PresentationDirector();
    const first = director.update(
      createInput({
        elapsedSeconds: 10,
        snapshot: createSnapshot({ stale: true }),
      })
    );
    const tooSoon = director.update(
      createInput({
        elapsedSeconds: 10.2,
        tick: 100,
        snapshot: createSnapshot({ stale: true }),
      })
    );
    const afterCooldown = director.update(
      createInput({
        elapsedSeconds: 11,
        tick: 101,
        snapshot: createSnapshot({ stale: true }),
      })
    );

    expect(first.cues.map(cue => cue.type)).toContain('MARKET_STALE');
    expect(tooSoon.cues.map(cue => cue.type)).not.toContain('MARKET_STALE');
    expect(afterCooldown.cues.map(cue => cue.type)).toContain('MARKET_STALE');
  });

  it('keeps gameplay bytes unchanged when presentation is disabled', () => {
    const director = new PresentationDirector();
    const input = createInput({ accessibilityIntensity: 0 });
    const hashBefore = JSON.stringify(input.snapshot);

    const presentation = director.update(input);

    expect(presentation.isEnabled).toBe(false);
    expect(JSON.stringify(input.snapshot)).toBe(hashBefore);
  });

  it('reports stale, reconnect, and safe-exit presentation states without market gameplay effects', () => {
    const director = new PresentationDirector();
    const stale = director.update(
      createInput({ snapshot: createSnapshot({ stale: true }) })
    );
    const reconnect = director.update(
      createInput({ tick: 11, snapshot: createSnapshot() })
    );
    const safeExit = director.update(
      createInput({
        tick: 12,
        snapshot: createSnapshot({ stale: true }),
        safeExitAvailable: true,
      })
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
