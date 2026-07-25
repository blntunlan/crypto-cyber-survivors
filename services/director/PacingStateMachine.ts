import { type MarketEventFamily, type PacingState } from './contracts';
import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';
import { SurvivalCurve } from './SurvivalCurve';

export type PacingSnapshot = {
  state: PacingState;
  threatMultiplier: number;
  remainingSeconds: number;
  doomStacks: number;
  queuedEventFamily: MarketEventFamily | null;
};

type BasePacingState = 'BUILD_UP' | 'PEAK' | 'PEAK_FADE' | 'RECOVERY';

const PHASE_ORDER: readonly BasePacingState[] = [
  'BUILD_UP',
  'PEAK',
  'PEAK_FADE',
  'RECOVERY',
];
const UINT32_RANGE = 4_294_967_296;

export class PacingStateMachine {
  private readonly config: DirectorConfigV1;
  private readonly survivalCurve: SurvivalCurve;
  private queuedEventFamily: MarketEventFamily | null = null;
  private readonly snapshot: PacingSnapshot = {
    state: 'BUILD_UP',
    threatMultiplier: 1,
    remainingSeconds: 0,
    doomStacks: 0,
    queuedEventFamily: null,
  };
  private runSeed = -1;
  private phaseIndex = 0;
  private phaseStartsAtSeconds = 0;
  private phaseEndsAtSeconds = 0;
  private lastElapsedSeconds = 0;

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
    this.survivalCurve = new SurvivalCurve(config);
  }

  public update(elapsedSeconds: number, seed: number): PacingSnapshot {
    const safeElapsedSeconds = Math.max(
      0,
      Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0
    );
    const safeSeed = Number.isSafeInteger(seed) ? seed : 0;
    if (safeSeed !== this.runSeed || safeElapsedSeconds < this.lastElapsedSeconds) {
      this.initialize(safeSeed);
    }

    while (safeElapsedSeconds >= this.phaseEndsAtSeconds) {
      this.phaseStartsAtSeconds = this.phaseEndsAtSeconds;
      this.phaseIndex += 1;
      this.phaseEndsAtSeconds =
        this.phaseStartsAtSeconds + this.getPhaseDuration(this.phaseIndex, safeSeed);
    }

    const baseState = PHASE_ORDER[this.phaseIndex % PHASE_ORDER.length]!;
    const doomStacks = this.survivalCurve.getDoomStacks(safeElapsedSeconds);
    const isDoomPeak =
      baseState === 'PEAK' &&
      safeElapsedSeconds >= this.config.survival.doomStartsAtSeconds;
    this.snapshot.state = isDoomPeak ? 'DOOM' : baseState;
    this.snapshot.threatMultiplier = this.getThreatMultiplier(baseState);
    this.snapshot.remainingSeconds = Math.max(
      0,
      this.phaseEndsAtSeconds - safeElapsedSeconds
    );
    this.snapshot.doomStacks = doomStacks;
    this.snapshot.queuedEventFamily = this.queuedEventFamily;
    this.lastElapsedSeconds = safeElapsedSeconds;
    return this.snapshot;
  }

  public requestMarketSurge(
    eventFamily: MarketEventFamily,
    elapsedSeconds: number
  ): boolean {
    if (elapsedSeconds < this.config.marketEvents.initialSurgeLockoutSeconds) {
      return false;
    }
    if (this.queuedEventFamily !== null) return false;
    this.queuedEventFamily = eventFamily;
    return true;
  }

  public getSnapshot(): PacingSnapshot {
    this.snapshot.queuedEventFamily = this.queuedEventFamily;
    return this.snapshot;
  }

  public clearQueuedMarketSurge(eventFamily?: MarketEventFamily): boolean {
    if (
      this.queuedEventFamily === null ||
      (eventFamily !== undefined && this.queuedEventFamily !== eventFamily)
    ) {
      return false;
    }
    this.queuedEventFamily = null;
    this.snapshot.queuedEventFamily = null;
    return true;
  }

  public reset(): void {
    this.queuedEventFamily = null;
    this.runSeed = -1;
    this.phaseIndex = 0;
    this.phaseStartsAtSeconds = 0;
    this.phaseEndsAtSeconds = 0;
    this.lastElapsedSeconds = 0;
    this.snapshot.state = 'BUILD_UP';
    this.snapshot.threatMultiplier = this.config.pacing.buildUp.threatMultiplier;
    this.snapshot.remainingSeconds = 0;
    this.snapshot.doomStacks = 0;
    this.snapshot.queuedEventFamily = null;
  }

  private initialize(seed: number): void {
    this.runSeed = seed;
    this.phaseIndex = 0;
    this.phaseStartsAtSeconds = 0;
    this.phaseEndsAtSeconds = this.getPhaseDuration(0, seed);
    this.lastElapsedSeconds = 0;
  }

  private getPhaseDuration(phaseIndex: number, seed: number): number {
    const state = PHASE_ORDER[phaseIndex % PHASE_ORDER.length]!;
    const range =
      state === 'BUILD_UP'
        ? this.config.pacing.buildUp
        : state === 'PEAK'
          ? this.config.pacing.peak
          : state === 'PEAK_FADE'
            ? this.config.pacing.peakFade
            : this.config.pacing.recovery;
    let hash = Math.imul(seed ^ phaseIndex ^ 0x9e3779b9, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
    const unit = (hash >>> 0) / UINT32_RANGE;
    const baseDuration =
      range.minSeconds + (range.maxSeconds - range.minSeconds) * unit;
    if (state !== 'RECOVERY') return baseDuration;
    const doomStacks = this.survivalCurve.getDoomStacks(this.phaseStartsAtSeconds);
    return this.survivalCurve.getRecoveryDuration(baseDuration, doomStacks);
  }

  private getThreatMultiplier(state: BasePacingState): number {
    if (state === 'BUILD_UP') return this.config.pacing.buildUp.threatMultiplier;
    if (state === 'PEAK') return this.config.pacing.peak.threatMultiplier;
    if (state === 'PEAK_FADE') return this.config.pacing.peakFade.threatMultiplier;
    return this.config.pacing.recovery.threatMultiplier;
  }
}
