import { describe, expect, it } from 'vitest';
import { PresentationDirector } from '../../../services/presentation/PresentationDirector';
import { type GameplaySnapshot } from '../../../services/director/contracts';

const createSnapshot = (doomStacks: number, greedLevel: number): GameplaySnapshot =>
  ({
    revision: 1,
    validFromTick: 1,
    pacing: {
      state: 'PEAK',
      threatMultiplier: 1.25,
      remainingSeconds: 10,
      doomStacks,
      supportEfficiency: 1,
    },
    greed: { level: greedLevel, pressure: 0.1 * greedLevel, recoveryReduction: 0 },
    threat: { target: 1, creditRate: 2, availableCredits: 4, maximumCredits: 16 },
    advantage: {
      creditRate: 0,
      availableCredits: 0,
      maximumCredits: 0,
      activeMechanic: null,
      movementMultiplier: 1,
      dashCooldownMultiplier: 1,
      endsAtElapsedSeconds: 0,
      activationSequence: 0,
    },
    enemy: {
      healthMultiplier: 1,
      damageMultiplier: 1,
      speedMultiplier: 1,
      spawnDensityMultiplier: 1,
      behaviorTier: 0,
    },
    environment: { regime: 'CALM', presentationIntensity: 0.2, isFavorable: false },
    encounter: {
      activeEventFamily: null,
      canStartMarketSurge: false,
      queuedEventFamily: null,
      phase: 'IDLE',
      primaryCardId: null,
      supportCardId: null,
      headwindChannels: [],
    },
  }) as GameplaySnapshot;

const update = (
  director: PresentationDirector,
  doomStacks: number,
  greedLevel: number,
  elapsedSeconds: number
) =>
  director.updateCurrent({
    deltaSeconds: 0.2,
    elapsedSeconds,
    tick: Math.round(elapsedSeconds * 5),
    snapshot: createSnapshot(doomStacks, greedLevel),
    marketStale: false,
    suggestedBpm: 120,
    accessibilityIntensity: 1,
    safeExitAvailable: false,
  });

const cueTypes = (snapshot: { cues: readonly { type: string }[] }) =>
  snapshot.cues.map(cue => cue.type);

describe('§8/§17 Doom and Greed are visible the moment they change', () => {
  it('cues a Doom stack once, on the transition', () => {
    const director = new PresentationDirector();

    expect(cueTypes(update(director, 0, 0, 10))).not.toContain('DOOM_STACK_GAINED');
    expect(cueTypes(update(director, 1, 0, 30))).toContain('DOOM_STACK_GAINED');
    expect(cueTypes(update(director, 1, 0, 60))).not.toContain('DOOM_STACK_GAINED');
    expect(cueTypes(update(director, 2, 0, 90))).toContain('DOOM_STACK_GAINED');
  });

  it('cues a greed level once, on the transition', () => {
    const director = new PresentationDirector();

    expect(cueTypes(update(director, 0, 0, 10))).not.toContain('GREED_LEVEL_GAINED');
    expect(cueTypes(update(director, 0, 1, 40))).toContain('GREED_LEVEL_GAINED');
    expect(cueTypes(update(director, 0, 1, 70))).not.toContain('GREED_LEVEL_GAINED');
  });

  it('never cues a decrease, because both escalations are permanent', () => {
    const director = new PresentationDirector();

    update(director, 2, 3, 10);
    const afterDrop = update(director, 1, 1, 40);

    expect(cueTypes(afterDrop)).not.toContain('DOOM_STACK_GAINED');
    expect(cueTypes(afterDrop)).not.toContain('GREED_LEVEL_GAINED');
  });

  it('forgets the escalation history on reset so a new run starts clean', () => {
    const director = new PresentationDirector();

    update(director, 3, 2, 10);
    director.reset();

    expect(cueTypes(update(director, 1, 1, 40))).toEqual(
      expect.arrayContaining(['DOOM_STACK_GAINED', 'GREED_LEVEL_GAINED'])
    );
  });
});
