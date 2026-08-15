import { FlowStateManager, type FlowState } from '../difficulty/FlowStateManager';
import { PriceMomentumEngine } from '../market/PriceMomentumEngine';

export type CoreLoopPhase = 'build' | 'release';

export interface CoreGameplayLoopInput {
  deltaMs: number;
  elapsedMs: number;
  hpPercent: number;
  enemyCount: number;
  killStreak: number;
  movementMagnitude: number;
  isDashing: boolean;
  didAttack?: boolean;
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
  /** Enemy count at which idle time accrues AFK suspicion at full rate. */
  AFK_THREAT_SATURATION_ENEMIES: 16,
  PHASE_SWITCH_SHAKE: 1.8,
  BUILD_HP_THRESHOLD: 58,
  RELEASE_HP_THRESHOLD: 38,
  BUILD_ENEMY_THRESHOLD: 16,
  RELEASE_ENEMY_THRESHOLD: 32,
  PLAYER_PULSE_SCALE: 0.06,
  MAX_UPDATE_DELTA_MS: 250,
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
  private simulationAccumulatorMs = 0;
  private readonly output: CoreGameplayLoopOutput = {
    flowState: 'flow',
    phase: 'build',
    flowScore: 1,
    playerScaleTargetX: 1,
    playerScaleTargetY: 1,
    pulse: 0,
    shakeBoost: 0,
    marketIntensity: 0,
    suggestedBPM: 80,
  };

  public reset(): void {
    this.phase = 'build';
    this.phaseElapsedMs = 0;
    this.pulse = 0;
    this.pendingShakeBoost = 0;
    this.smoothedMarketIntensity = 0;
    this.simulationAccumulatorMs = 0;
    FlowStateManager.reset();
  }

  public update(input: CoreGameplayLoopInput): CoreGameplayLoopOutput {
    const elapsedMs = Math.max(
      0,
      Number.isFinite(input.elapsedMs) ? input.elapsedMs : 0
    );
    const deltaMs = Math.min(
      CORE_GAMEPLAY_LOOP_CONFIG.MAX_UPDATE_DELTA_MS,
      Math.max(0, input.deltaMs)
    );
    const attackActivity = input.didAttack
      ? CORE_GAMEPLAY_LOOP_CONFIG.INPUT_ACTIVITY_THRESHOLD + 0.01
      : 0;
    const activity = clamp(
      input.movementMagnitude + (input.isDashing ? 0.35 : 0) + attackActivity,
      0,
      1
    );

    if (activity > CORE_GAMEPLAY_LOOP_CONFIG.INPUT_ACTIVITY_THRESHOLD) {
      FlowStateManager.recordInput(elapsedMs);
    }

    // `activity` above is a *feel* signal and deliberately counts auto-fire, but
    // AFK detection must not: `didAttack` comes from CombatSystem.processAutoFire,
    // which fires on a timer whenever anything is in range. Feeding it in would let
    // a parked player's own weapons prove they are at the keyboard — the exact hole
    // this accumulator exists to close. Movement and dash are the only genuinely
    // player-driven parts.
    const intentActivity = clamp(
      input.movementMagnitude + (input.isDashing ? 0.35 : 0),
      0,
      1
    );
    // Standing still only reads as suspicious when something is demanding a
    // reaction; an empty field is just a lull between waves.
    const threatPressure = clamp(
      input.enemyCount / CORE_GAMEPLAY_LOOP_CONFIG.AFK_THREAT_SATURATION_ENEMIES,
      0,
      1
    );

    const flowAnalysis = FlowStateManager.update(
      input.hpPercent,
      elapsedMs,
      intentActivity,
      threatPressure
    );

    // Get price momentum state (cached, zero allocation)
    const momentum = PriceMomentumEngine.getLatest();
    const mIntensity = momentum.intensity;
    this.simulationAccumulatorMs += deltaMs;
    const simulationSteps = Math.floor(
      (this.simulationAccumulatorMs + Number.EPSILON) / FRAME_MS
    );
    if (simulationSteps > 0) {
      this.simulationAccumulatorMs -= simulationSteps * FRAME_MS;
      if (Math.abs(this.simulationAccumulatorMs) < Number.EPSILON) {
        this.simulationAccumulatorMs = 0;
      }

      for (let step = 0; step < simulationSteps; step += 1) {
        this.advanceFixedStep(
          flowAnalysis.state,
          input.hpPercent,
          input.enemyCount,
          activity,
          mIntensity
        );
      }
    }

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

    const output = this.output;
    output.flowState = flowAnalysis.state;
    output.phase = this.phase;
    output.flowScore = flowScore;
    output.playerScaleTargetX = playerScaleTargetX;
    output.playerScaleTargetY = playerScaleTargetY;
    output.pulse = this.pulse;
    output.shakeBoost = shakeBoost;
    output.marketIntensity = this.smoothedMarketIntensity;
    output.suggestedBPM = momentum.suggestedBPM;
    return output;
  }

  private advanceFixedStep(
    flowState: FlowState,
    hpPercent: number,
    enemyCount: number,
    activity: number,
    marketIntensity: number
  ): void {
    this.phaseElapsedMs += FRAME_MS;

    // Fixed-step smoothing keeps the presentation rhythm independent of RAF rate.
    const intensityAlpha = this.getSmoothingAlpha(FRAME_MS) * 0.5;
    this.smoothedMarketIntensity = lerp(
      this.smoothedMarketIntensity,
      marketIntensity,
      intensityAlpha
    );

    this.maybeSwitchPhase(flowState, hpPercent, enemyCount, marketIntensity);

    const phaseDuration = this.getPhaseDuration(flowState, marketIntensity);
    const progress = clamp(this.phaseElapsedMs / phaseDuration, 0, 1);
    const phaseCurve = 0.5 - 0.5 * Math.cos(progress * Math.PI);
    const signedSwing = this.phase === 'build' ? phaseCurve : -phaseCurve;
    const targetPulse = clamp(
      Math.abs(signedSwing) *
        (0.55 + activity * 0.3 + this.smoothedMarketIntensity * 0.3),
      0,
      1
    );

    this.pulse = lerp(this.pulse, targetPulse, this.getSmoothingAlpha(FRAME_MS));
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
