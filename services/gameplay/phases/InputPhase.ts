import { GAME_ENGINE } from '../../../constants';
import { PLAYER_STATS } from '../../../config/PlayerConfig';
import { GameStatus } from '../../../types';
import { audio } from '../../audio';
import { BuffManager } from '../../patterns/decorators/BuffManager';
import { EventBus } from '../../core/EventBus';
import type { PhaseInput } from '../contracts';
import {
  createBaselinePhaseResult,
  type BaselinePhaseResult,
  type IGameplayPhase,
} from './IGameplayPhase';

interface InputPhaseSharedContract {
  deltaTime: number;
  dtFactor: number;
  timeMs: number;
  width: number;
  height: number;
  deviceIsMobile: boolean;
  getMovementVector: () => { dx: number; dy: number };
  isDashPressed: () => boolean;
  isDashFreshPress: () => boolean;
  consumeDash: () => void;
  inputVector?: { dx: number; dy: number };
}

export class InputPhase implements IGameplayPhase<'input'> {
  public readonly phase = 'input' as const;
  private readonly result = createBaselinePhaseResult(this.phase);
  private readonly inputVector = { dx: 0, dy: 0 };
  private readonly dashTrailPoints = Array.from(
    { length: Math.ceil(GAME_ENGINE.DASH_TRAIL_MAX_LENGTH * 1.5) },
    () => ({ x: 0, y: 0 })
  );
  private nextDashTrailPoint = 0;

  public execute(input: PhaseInput<'input'>): BaselinePhaseResult<'input'> {
    const result = this.result;
    if (input.context.status !== GameStatus.PLAYING) {
      return result;
    }

    const player = input.context.world.player.current;
    if (!player) {
      return result;
    }

    const s = input.context.world.gameState.current;
    const shared = input.shared as unknown as Partial<InputPhaseSharedContract>;

    if (
      !shared.getMovementVector ||
      !shared.isDashPressed ||
      !shared.isDashFreshPress ||
      !shared.consumeDash ||
      typeof shared.deltaTime !== 'number' ||
      typeof shared.dtFactor !== 'number' ||
      typeof shared.timeMs !== 'number' ||
      typeof shared.width !== 'number' ||
      typeof shared.height !== 'number' ||
      typeof shared.deviceIsMobile !== 'boolean'
    ) {
      return result;
    }

    const deltaTime = shared.deltaTime;
    const dtFactor = shared.dtFactor;
    const time = shared.timeMs;
    const width = shared.width;
    const height = shared.height;
    const isMobile = shared.deviceIsMobile;
    const dashCooldownMultiplier = player.dashCooldownMultiplier ?? 1;
    const dashCooldown = Math.max(
      1,
      GAME_ENGINE.DASH_COOLDOWN * dashCooldownMultiplier
    );
    const doubleDashCooldown = Math.max(
      1,
      GAME_ENGINE.DOUBLE_DASH_COOLDOWN * dashCooldownMultiplier
    );
    const doubleDashInputWindow = isMobile
      ? GAME_ENGINE.DASH_DURATION_MOBILE
      : GAME_ENGINE.PLAYER_DASH_DURATION;
    const elapsedSinceDash = dashCooldown - s.dashCooldownTimer;

    if (
      shared.isDashFreshPress() &&
      s.dashCooldownTimer > 0 &&
      elapsedSinceDash >= 0 &&
      elapsedSinceDash <= doubleDashInputWindow &&
      !s.doubleDashQueued &&
      !s.doubleDashUsed
    ) {
      s.doubleDashQueued = true;
      shared.consumeDash();
      s.shake = 5;
    }

    // Dash Logic Timers
    if (s.dashTimer > 0) {
      s.dashTimer -= deltaTime;

      // Update halo opacity - pulse during dash window
      s.dashHaloOpacity =
        Math.sin(time / GAME_ENGINE.DASH_HALO_PULSE_SPEED) *
          GAME_ENGINE.DASH_HALO_OPACITY_BASE +
        GAME_ENGINE.DASH_HALO_OPACITY_AMP;

      if (s.dashTimer <= 0) {
        s.isDashing = false;
        s.dashHaloOpacity = 0;
        s.playerScaleX = 0.4;
        s.playerScaleY = 1.6;
      }

      const maxTrail = s.isDashing
        ? Math.floor(GAME_ENGINE.DASH_TRAIL_MAX_LENGTH * 1.5)
        : GAME_ENGINE.DASH_TRAIL_MAX_LENGTH;
      s.dashTrailAccumulator += dtFactor;
      while (s.dashTrailAccumulator >= 1) {
        if (s.dashTrail.length >= maxTrail) {
          s.dashTrail.shift();
        }
        const trailPoint = this.dashTrailPoints[this.nextDashTrailPoint];
        if (trailPoint !== undefined) {
          trailPoint.x = player.x;
          trailPoint.y = player.y;
          s.dashTrail.push(trailPoint);
          this.nextDashTrailPoint =
            (this.nextDashTrailPoint + 1) % this.dashTrailPoints.length;
        }
        s.dashTrailAccumulator -= 1;
      }
    } else {
      s.dashHaloOpacity = 0;
      if (s.dashTrail.length > 0) {
        s.dashTrailAccumulator += dtFactor;
        while (s.dashTrailAccumulator >= 1) {
          if (s.dashTrail.length > 0) {
            s.dashTrail.shift();
          }
          s.dashTrailAccumulator -= 1;
        }
      } else {
        s.dashTrailAccumulator = 0;
      }
    }

    if (s.doubleDashQueued && !s.isDashing) {
      const { dx: ddx, dy: ddy } = shared.getMovementVector();
      if (ddx !== 0 || ddy !== 0) {
        const effectiveDashDuration = isMobile
          ? GAME_ENGINE.PLAYER_DASH_DURATION_MOBILE
          : GAME_ENGINE.PLAYER_DASH_DURATION;

        s.isDashing = true;
        s.dashTimer = effectiveDashDuration;
        s.doubleDashQueued = false;
        s.doubleDashUsed = true;
        s.dashCooldownTimer = doubleDashCooldown;
        audio.playDash();
        s.shake = 10;
        EventBus.emit('playerDash', {
          duration: effectiveDashDuration,
          cooldown: doubleDashCooldown,
          isDoubleDash: true,
        });

        s.playerScaleX = 1.8;
        s.playerScaleY = 0.4;
        s.playerRotation = Math.atan2(ddy, ddx);
      } else {
        s.doubleDashQueued = false;
      }
    }

    if (s.dashCooldownTimer > 0) {
      s.dashCooldownTimer -= deltaTime;
      if (s.dashCooldownTimer <= 0) {
        s.doubleDashUsed = false;
      }
    }

    const { dx, dy } = shared.getMovementVector();

    if (
      shared.isDashPressed() &&
      s.dashCooldownTimer <= 0 &&
      (dx !== 0 || dy !== 0) &&
      !s.isDashing
    ) {
      const effectiveDashDuration = isMobile
        ? GAME_ENGINE.PLAYER_DASH_DURATION_MOBILE
        : GAME_ENGINE.PLAYER_DASH_DURATION;

      s.isDashing = true;
      s.dashTimer = effectiveDashDuration;
      s.dashCooldownTimer = dashCooldown;
      s.doubleDashQueued = false;
      s.doubleDashUsed = false;
      audio.playDash();
      shared.consumeDash();
      EventBus.emit('playerDash', {
        duration: effectiveDashDuration,
        cooldown: dashCooldown,
        isDoubleDash: false,
      });

      s.playerScaleX = 1.8;
      s.playerScaleY = 0.4;
      s.playerRotation = Math.atan2(dy, dx);
    }

    // Animation metadata
    s.isMoving = Math.hypot(dx, dy) > 0.1;
    if (dx !== 0) {
      s.lastMoveX = dx > 0 ? 1 : -1;
    }

    if (dx !== 0 || dy !== 0) {
      const mag = Math.hypot(dx, dy);
      let speedMult = 1;
      let inputFactor = Math.min(1, mag);

      if (s.isDashing) {
        speedMult = GAME_ENGINE.DASH_SPEED_MULTIPLIER;
        inputFactor = 1.0;
      }

      const dirX = dx / mag;
      const dirY = dy / mag;

      if (!s.isDashing) {
        s.playerRotation = Math.atan2(dy, dx);
      }

      const rawSpeed = BuffManager.isInitialized()
        ? BuffManager.getDecoratedStats().getSpeed()
        : player.speed;
      const effectiveSpeed = Math.min(rawSpeed, PLAYER_STATS.MAX_SPEED);

      player.x += dirX * inputFactor * effectiveSpeed * speedMult * dtFactor;
      player.y += dirY * inputFactor * effectiveSpeed * speedMult * dtFactor;
    }

    // Clamp player to screen bounds
    player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(height - player.radius, player.y));

    this.inputVector.dx = dx;
    this.inputVector.dy = dy;
    shared.inputVector = this.inputVector;
    return result;
  }
}
