import {
  DIRECTOR_CONFIG_V1,
  type DirectorConfigV1,
} from '../director/config/DirectorConfigV1';
import { type RuntimeDifficultySnapshot } from '../../types/runtimeDifficulty';

export const PRESENTATION_CUE_TYPES = [
  'ENCOUNTER_TELEGRAPH',
  'ENCOUNTER_ACTIVE',
  'MARKET_STALE',
  'MARKET_RECONNECTED',
  'SAFE_EXIT_AVAILABLE',
] as const;

export type PresentationCueType = (typeof PRESENTATION_CUE_TYPES)[number];

export type PresentationCue = {
  type: PresentationCueType;
  intensity: number;
  tick: number;
};

export type PresentationInput = {
  deltaSeconds: number;
  tick: number;
  snapshot: RuntimeDifficultySnapshot;
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
  private readonly lastCueAtTick = new Map<PresentationCueType, number>();

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

  public reset(): void {
    this.favorable = UNIT_MINIMUM;
    this.volatility = UNIT_MINIMUM;
    this.bpm = UNIT_MINIMUM;
    this.liquidationTension = UNIT_MINIMUM;
    this.previousMarketStatus = 'LIVE';
    this.telegraphedEventFamily = null;
    this.lastCueAtTick.clear();
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
      this.pushCue('MARKET_STALE', input.tick, accessibilityIntensity, cues);
      if (input.safeExitAvailable) {
        this.pushCue('SAFE_EXIT_AVAILABLE', input.tick, accessibilityIntensity, cues);
      }
    } else if (this.previousMarketStatus === 'STALE') {
      this.pushCue('MARKET_RECONNECTED', input.tick, accessibilityIntensity, cues);
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
      this.pushCue('ENCOUNTER_TELEGRAPH', input.tick, accessibilityIntensity, cues);
      return;
    }

    if (phase === 'ACTIVE' && this.telegraphedEventFamily === family) {
      this.pushCue('ENCOUNTER_ACTIVE', input.tick, accessibilityIntensity, cues);
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
    intensity: number,
    cues: PresentationCue[]
  ): void {
    const cooldownTicks = Math.ceil(
      this.config.presentation.cueCooldownSeconds *
        this.config.runtime.updateFrequencyHz
    );
    const previousTick = this.lastCueAtTick.get(type);
    if (previousTick !== undefined && tick - previousTick < cooldownTicks) return;

    this.lastCueAtTick.set(type, tick);
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
