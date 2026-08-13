import {
  DIRECTOR_CONFIG_V1,
  type DirectorConfigV1,
} from '../director/config/DirectorConfigV1';
import { type RuntimeDifficultySnapshot } from '../../types/runtimeDifficulty';
import { type GameplaySnapshot } from '../director/contracts';

export const PRESENTATION_CUE_TYPES = [
  'ENCOUNTER_TELEGRAPH',
  'ENCOUNTER_ACTIVE',
  'MARKET_STALE',
  'MARKET_RECONNECTED',
  'SAFE_EXIT_AVAILABLE',
  // §8: Doom is a visible state. §17: a greed change must be felt immediately
  // and explained, so both transitions get their own cue.
  'DOOM_STACK_GAINED',
  'GREED_LEVEL_GAINED',
] as const;

export type PresentationCueType = (typeof PRESENTATION_CUE_TYPES)[number];

export type PresentationCue = {
  type: PresentationCueType;
  intensity: number;
  tick: number;
};

export type PresentationInput = {
  deltaSeconds: number;
  elapsedSeconds: number;
  tick: number;
  snapshot: RuntimeDifficultySnapshot;
  suggestedBpm: number;
  accessibilityIntensity: number;
  safeExitAvailable: boolean;
};

export type CurrentPresentationInput = {
  deltaSeconds: number;
  elapsedSeconds: number;
  tick: number;
  snapshot: GameplaySnapshot;
  marketStale: boolean;
  suggestedBpm: number;
  accessibilityIntensity: number;
  safeExitAvailable: boolean;
};

export type PresentationSnapshot = {
  isEnabled: boolean;
  ambience: {
    favorable: number;
    volatility: number;
    bpm: number;
    liquidationTension: number;
  };
  sensory: {
    shake: number;
    flash: number;
    hitStop: number;
    audioAccent: number;
  };
  cues: readonly PresentationCue[];
};

const UNIT_MINIMUM = 0;
const UNIT_MAXIMUM = 1;

const clampUnit = (value: number): number =>
  Math.min(
    UNIT_MAXIMUM,
    Math.max(UNIT_MINIMUM, Number.isFinite(value) ? value : UNIT_MINIMUM)
  );

export class PresentationDirector {
  private readonly config: DirectorConfigV1;
  private favorable = UNIT_MINIMUM;
  private volatility = UNIT_MINIMUM;
  private bpm = UNIT_MINIMUM;
  private liquidationTension = UNIT_MINIMUM;
  private previousMarketStatus: 'LIVE' | 'STALE' = 'LIVE';
  private telegraphedEventFamily: string | null = null;
  private lastDoomStacks = 0;
  private lastGreedLevel = 0;
  private readonly lastCueAtSeconds = new Map<PresentationCueType, number>();

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
  }

  public update(input: PresentationInput): PresentationSnapshot {
    const accessibilityIntensity = clampUnit(input.accessibilityIntensity);
    const marketStatus = this.getMarketStatus(input.snapshot);
    if (accessibilityIntensity === UNIT_MINIMUM) {
      this.previousMarketStatus = marketStatus;
      return this.createDisabledSnapshot();
    }

    const cues: PresentationCue[] = [];
    this.updateAmbience(input);
    this.collectStatusCues(input, marketStatus, cues, accessibilityIntensity);
    this.collectEncounterCues(input, cues, accessibilityIntensity);
    const sensory = this.createSensorySnapshot(input, accessibilityIntensity);

    return {
      isEnabled: true,
      ambience: {
        favorable: this.favorable,
        volatility: this.volatility,
        bpm: this.bpm,
        liquidationTension: this.liquidationTension,
      },
      sensory,
      cues,
    };
  }

  public updateCurrent(input: CurrentPresentationInput): PresentationSnapshot {
    const accessibilityIntensity = clampUnit(input.accessibilityIntensity);
    const marketStatus = input.marketStale ? 'STALE' : 'LIVE';
    if (accessibilityIntensity === UNIT_MINIMUM) {
      this.previousMarketStatus = marketStatus;
      return this.createDisabledSnapshot();
    }

    const alpha =
      1 -
      Math.exp(
        -Math.max(UNIT_MINIMUM, input.deltaSeconds) /
          this.config.presentation.ambienceSmoothingSeconds
      );
    const intensity = clampUnit(input.snapshot.environment.presentationIntensity);
    const favorableTarget = input.snapshot.environment.isFavorable
      ? intensity
      : UNIT_MINIMUM;
    this.favorable += (favorableTarget - this.favorable) * alpha;
    this.volatility += (intensity - this.volatility) * alpha;
    this.bpm += (Math.max(UNIT_MINIMUM, input.suggestedBpm) - this.bpm) * alpha;
    this.liquidationTension += (UNIT_MINIMUM - this.liquidationTension) * alpha;

    const cues: PresentationCue[] = [];
    if (marketStatus === 'STALE') {
      this.pushCue(
        'MARKET_STALE',
        input.tick,
        input.elapsedSeconds,
        accessibilityIntensity,
        cues
      );
      if (input.safeExitAvailable) {
        this.pushCue(
          'SAFE_EXIT_AVAILABLE',
          input.tick,
          input.elapsedSeconds,
          accessibilityIntensity,
          cues
        );
      }
    } else if (this.previousMarketStatus === 'STALE') {
      this.pushCue(
        'MARKET_RECONNECTED',
        input.tick,
        input.elapsedSeconds,
        accessibilityIntensity,
        cues
      );
    }
    this.previousMarketStatus = marketStatus;

    this.collectProgressionCues(
      input.snapshot.pacing.doomStacks,
      input.snapshot.greed.level,
      input.tick,
      input.elapsedSeconds,
      accessibilityIntensity,
      cues
    );

    const family = input.snapshot.encounter.activeEventFamily;
    const phase = input.snapshot.encounter.phase;
    if (family !== null && phase === 'TELEGRAPH') {
      this.telegraphedEventFamily = family;
      this.pushCue(
        'ENCOUNTER_TELEGRAPH',
        input.tick,
        input.elapsedSeconds,
        accessibilityIntensity,
        cues
      );
    } else if (
      family !== null &&
      phase === 'ACTIVE' &&
      this.telegraphedEventFamily === family
    ) {
      this.pushCue(
        'ENCOUNTER_ACTIVE',
        input.tick,
        input.elapsedSeconds,
        accessibilityIntensity,
        cues
      );
    }

    const requestedShake = Math.min(
      this.config.presentation.maximumShake,
      intensity * this.config.presentation.maximumShake
    );
    const requestedAudioAccent = intensity;
    const total = requestedShake + requestedAudioAccent;
    const budgetScale =
      total <= this.config.presentation.maximumSensoryLoad
        ? UNIT_MAXIMUM
        : this.config.presentation.maximumSensoryLoad / total;

    return {
      isEnabled: true,
      ambience: {
        favorable: this.favorable,
        volatility: this.volatility,
        bpm: this.bpm,
        liquidationTension: this.liquidationTension,
      },
      sensory: {
        shake: requestedShake * budgetScale * accessibilityIntensity,
        flash: UNIT_MINIMUM,
        hitStop: UNIT_MINIMUM,
        audioAccent: requestedAudioAccent * budgetScale * accessibilityIntensity,
      },
      cues,
    };
  }

  public reset(): void {
    this.favorable = UNIT_MINIMUM;
    this.volatility = UNIT_MINIMUM;
    this.bpm = UNIT_MINIMUM;
    this.liquidationTension = UNIT_MINIMUM;
    this.previousMarketStatus = 'LIVE';
    this.telegraphedEventFamily = null;
    this.lastDoomStacks = 0;
    this.lastGreedLevel = 0;
    this.lastCueAtSeconds.clear();
  }

  /**
   * Doom and greed are permanent, monotonic escalations. Cueing only on the
   * transition keeps them legible without nagging every commit, and the cue
   * intensity carries the new level so the HUD can size its reaction.
   */
  private collectProgressionCues(
    doomStacks: number,
    greedLevel: number,
    tick: number,
    elapsedSeconds: number,
    accessibilityIntensity: number,
    cues: PresentationCue[]
  ): void {
    if (doomStacks > this.lastDoomStacks) {
      this.lastDoomStacks = doomStacks;
      this.pushCue(
        'DOOM_STACK_GAINED',
        tick,
        elapsedSeconds,
        accessibilityIntensity,
        cues
      );
    }
    if (greedLevel > this.lastGreedLevel) {
      this.lastGreedLevel = greedLevel;
      this.pushCue(
        'GREED_LEVEL_GAINED',
        tick,
        elapsedSeconds,
        accessibilityIntensity,
        cues
      );
    }
  }

  private updateAmbience(input: PresentationInput): void {
    const snapshot = input.snapshot;
    const alpha =
      1 -
      Math.exp(
        -Math.max(UNIT_MINIMUM, input.deltaSeconds) /
          this.config.presentation.ambienceSmoothingSeconds
      );
    this.favorable +=
      (clampUnit((snapshot.signals.position.alignment + UNIT_MAXIMUM) / 2) -
        this.favorable) *
      alpha;
    this.volatility +=
      (clampUnit(snapshot.signals.market.volatility) - this.volatility) * alpha;
    const suggestedBpm =
      input.suggestedBpm > 0 ? input.suggestedBpm : snapshot.presentation.suggestedBpm;
    this.bpm += (Math.max(UNIT_MINIMUM, suggestedBpm) - this.bpm) * alpha;
    this.liquidationTension +=
      (clampUnit(snapshot.signals.position.liquidationProximity) -
        this.liquidationTension) *
      alpha;
  }

  private collectStatusCues(
    input: PresentationInput,
    marketStatus: 'LIVE' | 'STALE',
    cues: PresentationCue[],
    accessibilityIntensity: number
  ): void {
    if (marketStatus === 'STALE') {
      this.pushCue(
        'MARKET_STALE',
        input.tick,
        input.elapsedSeconds,
        accessibilityIntensity,
        cues
      );
      if (input.safeExitAvailable) {
        this.pushCue(
          'SAFE_EXIT_AVAILABLE',
          input.tick,
          input.elapsedSeconds,
          accessibilityIntensity,
          cues
        );
      }
    } else if (this.previousMarketStatus === 'STALE') {
      this.pushCue(
        'MARKET_RECONNECTED',
        input.tick,
        input.elapsedSeconds,
        accessibilityIntensity,
        cues
      );
    }
    this.previousMarketStatus = marketStatus;
  }

  private collectEncounterCues(
    input: PresentationInput,
    cues: PresentationCue[],
    accessibilityIntensity: number
  ): void {
    const { family, phase } = input.snapshot.encounter;
    if (family === null) return;

    if (phase === 'TELEGRAPH') {
      this.telegraphedEventFamily = family;
      this.pushCue(
        'ENCOUNTER_TELEGRAPH',
        input.tick,
        input.elapsedSeconds,
        accessibilityIntensity,
        cues
      );
      return;
    }

    if (phase === 'ACTIVE' && this.telegraphedEventFamily === family) {
      this.pushCue(
        'ENCOUNTER_ACTIVE',
        input.tick,
        input.elapsedSeconds,
        accessibilityIntensity,
        cues
      );
    }
  }

  private createSensorySnapshot(
    input: PresentationInput,
    accessibilityIntensity: number
  ): PresentationSnapshot['sensory'] {
    const snapshot = input.snapshot;
    const requestedShake = Math.min(
      this.config.presentation.maximumShake,
      snapshot.presentation.shakeLimit
    );
    const requestedFlash = Math.min(
      this.config.presentation.maximumFlash,
      snapshot.signals.position.liquidationProximity *
        this.config.presentation.maximumFlash
    );
    const requestedHitStop = UNIT_MINIMUM;
    const requestedAudioAccent = clampUnit(snapshot.presentation.audioIntensity);
    const total =
      requestedShake + requestedFlash + requestedHitStop + requestedAudioAccent;
    const budgetScale =
      total <= this.config.presentation.maximumSensoryLoad
        ? UNIT_MAXIMUM
        : this.config.presentation.maximumSensoryLoad / total;

    return {
      shake: requestedShake * budgetScale * accessibilityIntensity,
      flash: requestedFlash * budgetScale * accessibilityIntensity,
      hitStop: Math.min(
        this.config.presentation.maximumHitStop,
        requestedHitStop * budgetScale * accessibilityIntensity
      ),
      audioAccent: requestedAudioAccent * budgetScale * accessibilityIntensity,
    };
  }

  private getMarketStatus(snapshot: RuntimeDifficultySnapshot): 'LIVE' | 'STALE' {
    return snapshot.signals.market.reasonCodes.includes('MARKET_STALE')
      ? 'STALE'
      : 'LIVE';
  }

  private pushCue(
    type: PresentationCueType,
    tick: number,
    elapsedSeconds: number,
    intensity: number,
    cues: PresentationCue[]
  ): void {
    const safeElapsedSeconds = Math.max(
      UNIT_MINIMUM,
      Number.isFinite(elapsedSeconds) ? elapsedSeconds : UNIT_MINIMUM
    );
    const previousSeconds = this.lastCueAtSeconds.get(type);
    if (
      previousSeconds !== undefined &&
      safeElapsedSeconds - previousSeconds < this.config.presentation.cueCooldownSeconds
    ) {
      return;
    }

    this.lastCueAtSeconds.set(type, safeElapsedSeconds);
    cues.push({ type, intensity, tick });
  }

  private createDisabledSnapshot(): PresentationSnapshot {
    return {
      isEnabled: false,
      ambience: {
        favorable: UNIT_MINIMUM,
        volatility: UNIT_MINIMUM,
        bpm: UNIT_MINIMUM,
        liquidationTension: UNIT_MINIMUM,
      },
      sensory: {
        shake: UNIT_MINIMUM,
        flash: UNIT_MINIMUM,
        hitStop: UNIT_MINIMUM,
        audioAccent: UNIT_MINIMUM,
      },
      cues: [],
    };
  }
}
