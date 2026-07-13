import { FlowStateManager, type FlowState } from '../difficulty/FlowStateManager';
import { PriceMomentumEngine } from '../market/PriceMomentumEngine';

export type CoreLoopPhase = 'build' | 'release';

export interface CoreGameplayLoopInput {
  deltaMs: number;
  hpPercent: number;
  enemyCount: number;
  killStreak: number;
  movementMagnitude: number;
  isDashing: boolean;
  didAttack?: boolean;
  nowMs?: number;
}

export interface CoreGameplayLoopOutput {
  flowState: FlowState;
  phase: CoreLoopPhase;
  flowScore: number;
  playerScaleTargetX: number;
  playerScaleTargetY: number;
  pulse: number;
  shakeBoost: number;
  /** Market intensity (0-1) for audio/visual systems */
  marketIntensity: number;
  /** Suggested BPM from price momentum */
  suggestedBPM: number;
}

export const CORE_GAMEPLAY_LOOP_CONFIG = {
  FLOW_HP_TARGET: 50,
  FLOW_HP_BAND: 15,
  BUILD_PHASE_MS: 6200,
  RELEASE_PHASE_MS: 3600,
  MIN_PHASE_DURATION_MS: 2200,
  YOYO_SWING: 0.24,
  SMOOTHING_PER_FRAME: 0.16,
  INPUT_ACTIVITY_THRESHOLD: 0.08,
  PHASE_SWITCH_SHAKE: 1.8,
  BUILD_HP_THRESHOLD: 58,
  RELEASE_HP_THRESHOLD: 38,
  BUILD_ENEMY_THRESHOLD: 16,
  RELEASE_ENEMY_THRESHOLD: 32,
  PLAYER_PULSE_SCALE: 0.06,
} as const;

const FRAME_MS = 1000 / 60;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const lerp = (from: number, to: number, alpha: number): number => {
  return from + (to - from) * alpha;
};

/**
 * Core gameplay pacing loop:
 * - Uses flow analysis to keep player in the challenge sweet spot.
 * - Alternates "build" and "release" phases for yoyo-like rhythm.
 * - Integrates PriceMomentumEngine for market-driven feel.
 */
export class CoreGameplayLoop {
  private phase: CoreLoopPhase = 'build';
  private phaseElapsedMs = 0;
  private pulse = 0;
  private pendingShakeBoost = 0;
  private smoothedMarketIntensity = 0;

  public reset(): void {
    this.phase = 'build';
    this.phaseElapsedMs = 0;
    this.pulse = 0;
    this.pendingShakeBoost = 0;
    this.smoothedMarketIntensity = 0;
    FlowStateManager.reset();
  }

  public update(input: CoreGameplayLoopInput): CoreGameplayLoopOutput {
    const nowMs = input.nowMs ?? Date.now();
    const deltaMs = Math.max(0, input.deltaMs);
    const attackActivity = input.didAttack
      ? CORE_GAMEPLAY_LOOP_CONFIG.INPUT_ACTIVITY_THRESHOLD + 0.01
      : 0;
    const activity = clamp(
      input.movementMagnitude + (input.isDashing ? 0.35 : 0) + attackActivity,
      0,
      1
    );

    if (activity > CORE_GAMEPLAY_LOOP_CONFIG.INPUT_ACTIVITY_THRESHOLD) {
      FlowStateManager.recordInput(nowMs);
    }

    const flowAnalysis = FlowStateManager.update(input.hpPercent, nowMs);
    this.phaseElapsedMs += deltaMs;

    // Get price momentum state (cached, zero allocation)
    const momentum = PriceMomentumEngine.getLatest();
    const mIntensity = momentum.intensity;

    // Smooth market intensity for visual/audio (avoids jarring jumps)
    const iAlpha = this.getSmoothingAlpha(deltaMs) * 0.5; // Slower smoothing for market
    this.smoothedMarketIntensity = lerp(
      this.smoothedMarketIntensity,
      mIntensity,
      iAlpha
    );

    this.maybeSwitchPhase(
      flowAnalysis.state,
      input.hpPercent,
      input.enemyCount,
      mIntensity
    );

    const phaseDuration = this.getPhaseDuration(flowAnalysis.state, mIntensity);
    const progress = clamp(this.phaseElapsedMs / phaseDuration, 0, 1);
    const phaseCurve = 0.5 - 0.5 * Math.cos(progress * Math.PI);
    const signedSwing = this.phase === 'build' ? phaseCurve : -phaseCurve;

    // Pulse is amplified by market intensity for a breathing effect
    const targetPulse = clamp(
      Math.abs(signedSwing) *
        (0.55 + activity * 0.3 + this.smoothedMarketIntensity * 0.3),
      0,
      1
    );

    const smoothingAlpha = this.getSmoothingAlpha(deltaMs);
    this.pulse = lerp(this.pulse, targetPulse, smoothingAlpha);

    const pulseScale = this.pulse * CORE_GAMEPLAY_LOOP_CONFIG.PLAYER_PULSE_SCALE;
    const playerScaleTargetX =
      this.phase === 'build' ? 1 + pulseScale : 1 - pulseScale * 0.45;
    const playerScaleTargetY =
      this.phase === 'build' ? 1 - pulseScale * 0.65 : 1 + pulseScale * 0.35;
    const shakeBoost = this.consumeShakeBoost();
    const flowScore =
      1 -
      clamp(
        Math.abs(input.hpPercent - CORE_GAMEPLAY_LOOP_CONFIG.FLOW_HP_TARGET) /
          CORE_GAMEPLAY_LOOP_CONFIG.FLOW_HP_BAND,
        0,
        1
      );

    return {
      flowState: flowAnalysis.state,
      phase: this.phase,
      flowScore,
      playerScaleTargetX,
      playerScaleTargetY,
      pulse: this.pulse,
      shakeBoost,
      marketIntensity: this.smoothedMarketIntensity,
      suggestedBPM: momentum.suggestedBPM,
    };
  }

  private maybeSwitchPhase(
    flowState: FlowState,
    hpPercent: number,
    enemyCount: number,
    marketIntensity: number
  ): void {
    const minDurationReached =
      this.phaseElapsedMs >= CORE_GAMEPLAY_LOOP_CONFIG.MIN_PHASE_DURATION_MS;
    const phaseDuration = this.getPhaseDuration(flowState, marketIntensity);

    if (!minDurationReached) return;

    const shouldRelease =
      flowState === 'stressed' ||
      hpPercent <= CORE_GAMEPLAY_LOOP_CONFIG.RELEASE_HP_THRESHOLD ||
      enemyCount >= CORE_GAMEPLAY_LOOP_CONFIG.RELEASE_ENEMY_THRESHOLD;
    const shouldBuild =
      flowState === 'bored' ||
      hpPercent >= CORE_GAMEPLAY_LOOP_CONFIG.BUILD_HP_THRESHOLD ||
      enemyCount <= CORE_GAMEPLAY_LOOP_CONFIG.BUILD_ENEMY_THRESHOLD;

    if (this.phase === 'build' && shouldRelease) {
      this.switchPhase('release');
      return;
    }

    if (this.phase === 'release' && shouldBuild) {
      this.switchPhase('build');
      return;
    }

    if (this.phaseElapsedMs >= phaseDuration) {
      this.switchPhase(
        this.phase === 'build' ? 'release' : 'build',
        this.phaseElapsedMs - phaseDuration
      );
    }
  }

  private switchPhase(nextPhase: CoreLoopPhase, elapsedMs = 0): void {
    if (nextPhase === this.phase) return;
    this.phase = nextPhase;
    this.phaseElapsedMs = elapsedMs;
    this.pendingShakeBoost = CORE_GAMEPLAY_LOOP_CONFIG.PHASE_SWITCH_SHAKE;
  }

  /**
   * Phase duration is modulated by flow state AND market intensity.
   * High market intensity → shorter build phases (less breathing room)
   *                       → shorter release phases (faster rhythm)
   * This makes the game pulse with the market's energy.
   */
  private getPhaseDuration(flowState: FlowState, marketIntensity: number = 0): number {
    // Market intensity compression: high intensity = shorter phases = faster rhythm
    // 0 intensity → 1.0x duration, 1.0 intensity → 0.65x duration
    const marketCompression = 1.0 - marketIntensity * 0.35;

    if (this.phase === 'build') {
      let base = CORE_GAMEPLAY_LOOP_CONFIG.BUILD_PHASE_MS;
      if (flowState === 'stressed') base *= 1.2;
      else if (flowState === 'bored') base *= 0.85;
      return base * marketCompression;
    }

    let base = CORE_GAMEPLAY_LOOP_CONFIG.RELEASE_PHASE_MS;
    if (flowState === 'stressed') base *= 1.3;
    else if (flowState === 'bored') base *= 0.8;
    return base * marketCompression;
  }

  private getSmoothingAlpha(deltaMs: number): number {
    const frames = Math.max(0, deltaMs) / FRAME_MS;
    return 1 - Math.pow(1 - CORE_GAMEPLAY_LOOP_CONFIG.SMOOTHING_PER_FRAME, frames);
  }

  private consumeShakeBoost(): number {
    const value = this.pendingShakeBoost;
    this.pendingShakeBoost = 0;
    return value;
  }
}
