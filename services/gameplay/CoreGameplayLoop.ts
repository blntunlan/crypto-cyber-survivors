import { FlowStateManager, type FlowState } from '../difficulty/FlowStateManager';

export type CoreLoopPhase = 'build' | 'release';

export interface CoreGameplayLoopInput {
  deltaMs: number;
  hpPercent: number;
  enemyCount: number;
  killStreak: number;
  movementMagnitude: number;
  isDashing: boolean;
  nowMs?: number;
}

export interface CoreGameplayLoopOutput {
  flowState: FlowState;
  phase: CoreLoopPhase;
  flowScore: number;
  spawnMultiplier: number;
  enemySpeedMultiplier: number;
  enemyDamageMultiplier: number;
  playerScaleTargetX: number;
  playerScaleTargetY: number;
  pulse: number;
  shakeBoost: number;
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
  SPAWN_MIN: 0.6,
  SPAWN_MAX: 1.75,
  SPEED_MIN: 0.8,
  SPEED_MAX: 1.25,
  DAMAGE_MIN: 0.75,
  DAMAGE_MAX: 1.2,
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
 */
export class CoreGameplayLoop {
  private phase: CoreLoopPhase = 'build';
  private phaseElapsedMs = 0;
  private spawnMultiplier = 1;
  private enemySpeedMultiplier = 1;
  private enemyDamageMultiplier = 1;
  private pulse = 0;
  private pendingShakeBoost = 0;

  public reset(): void {
    this.phase = 'build';
    this.phaseElapsedMs = 0;
    this.spawnMultiplier = 1;
    this.enemySpeedMultiplier = 1;
    this.enemyDamageMultiplier = 1;
    this.pulse = 0;
    this.pendingShakeBoost = 0;
    FlowStateManager.reset();
  }

  public update(input: CoreGameplayLoopInput): CoreGameplayLoopOutput {
    const nowMs = input.nowMs ?? Date.now();
    const deltaMs = Math.max(0, input.deltaMs);
    const activity = clamp(
      input.movementMagnitude + (input.isDashing ? 0.35 : 0),
      0,
      1
    );

    if (activity > CORE_GAMEPLAY_LOOP_CONFIG.INPUT_ACTIVITY_THRESHOLD) {
      FlowStateManager.recordInput(nowMs);
    }

    const flowAnalysis = FlowStateManager.update(input.hpPercent, nowMs);
    this.phaseElapsedMs += deltaMs;

    this.maybeSwitchPhase(flowAnalysis.state, input.hpPercent, input.enemyCount);

    const phaseDuration = this.getPhaseDuration(flowAnalysis.state);
    const progress = clamp(this.phaseElapsedMs / phaseDuration, 0, 1);
    const phaseCurve = 0.5 - 0.5 * Math.cos(progress * Math.PI); // smooth 0 -> 1
    const signedSwing = this.phase === 'build' ? phaseCurve : -phaseCurve;

    const flowSwingScale =
      flowAnalysis.state === 'bored'
        ? 1.15
        : flowAnalysis.state === 'stressed'
          ? 0.65
          : 0.9;
    const streakMomentum = clamp(input.killStreak / 30, 0, 1);
    const swingMagnitude =
      CORE_GAMEPLAY_LOOP_CONFIG.YOYO_SWING *
      (0.7 + streakMomentum * 0.2 + activity * 0.1) *
      flowSwingScale;

    const yoyoMultiplier = 1 + signedSwing * swingMagnitude;
    const targetSpawn = clamp(
      flowAnalysis.suggestedCorrections.spawnRateMultiplier * yoyoMultiplier,
      CORE_GAMEPLAY_LOOP_CONFIG.SPAWN_MIN,
      CORE_GAMEPLAY_LOOP_CONFIG.SPAWN_MAX
    );
    const targetSpeed = clamp(
      flowAnalysis.suggestedCorrections.enemySpeedMultiplier *
        (1 + signedSwing * swingMagnitude * 0.45),
      CORE_GAMEPLAY_LOOP_CONFIG.SPEED_MIN,
      CORE_GAMEPLAY_LOOP_CONFIG.SPEED_MAX
    );
    const targetDamage = clamp(
      flowAnalysis.suggestedCorrections.enemyDamageMultiplier *
        (1 + signedSwing * swingMagnitude * 0.35),
      CORE_GAMEPLAY_LOOP_CONFIG.DAMAGE_MIN,
      CORE_GAMEPLAY_LOOP_CONFIG.DAMAGE_MAX
    );
    const targetPulse = clamp(Math.abs(signedSwing) * (0.55 + activity * 0.45), 0, 1);

    const smoothingAlpha = this.getSmoothingAlpha(deltaMs);
    this.spawnMultiplier = lerp(this.spawnMultiplier, targetSpawn, smoothingAlpha);
    this.enemySpeedMultiplier = lerp(
      this.enemySpeedMultiplier,
      targetSpeed,
      smoothingAlpha
    );
    this.enemyDamageMultiplier = lerp(
      this.enemyDamageMultiplier,
      targetDamage,
      smoothingAlpha
    );
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
      spawnMultiplier: this.spawnMultiplier,
      enemySpeedMultiplier: this.enemySpeedMultiplier,
      enemyDamageMultiplier: this.enemyDamageMultiplier,
      playerScaleTargetX,
      playerScaleTargetY,
      pulse: this.pulse,
      shakeBoost,
    };
  }

  private maybeSwitchPhase(
    flowState: FlowState,
    hpPercent: number,
    enemyCount: number
  ): void {
    const minDurationReached =
      this.phaseElapsedMs >= CORE_GAMEPLAY_LOOP_CONFIG.MIN_PHASE_DURATION_MS;
    const phaseDuration = this.getPhaseDuration(flowState);

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
      this.switchPhase(this.phase === 'build' ? 'release' : 'build');
    }
  }

  private switchPhase(nextPhase: CoreLoopPhase): void {
    if (nextPhase === this.phase) return;
    this.phase = nextPhase;
    this.phaseElapsedMs = 0;
    this.pendingShakeBoost = CORE_GAMEPLAY_LOOP_CONFIG.PHASE_SWITCH_SHAKE;
  }

  private getPhaseDuration(flowState: FlowState): number {
    if (this.phase === 'build') {
      if (flowState === 'stressed') {
        return CORE_GAMEPLAY_LOOP_CONFIG.BUILD_PHASE_MS * 1.2;
      }
      if (flowState === 'bored') {
        return CORE_GAMEPLAY_LOOP_CONFIG.BUILD_PHASE_MS * 0.85;
      }
      return CORE_GAMEPLAY_LOOP_CONFIG.BUILD_PHASE_MS;
    }

    if (flowState === 'stressed') {
      return CORE_GAMEPLAY_LOOP_CONFIG.RELEASE_PHASE_MS * 1.3;
    }
    if (flowState === 'bored') {
      return CORE_GAMEPLAY_LOOP_CONFIG.RELEASE_PHASE_MS * 0.8;
    }
    return CORE_GAMEPLAY_LOOP_CONFIG.RELEASE_PHASE_MS;
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
