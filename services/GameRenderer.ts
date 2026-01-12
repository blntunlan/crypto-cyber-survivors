import { GameStatus, type Player, type GameState } from '../types';
import { type IPoolManager } from './interfaces/IPoolManager';
import {
  BackgroundRenderer,
  EntityRenderer,
  ProjectileRenderer,
  EffectRenderer,
} from './renderers';
import { type GraphicsConfig } from './renderers/types';
import { type IGameRenderer } from './interfaces/IGameRenderer';
import { GAME_ENGINE } from '../constants';
import { TimeService } from './TimeService';

/**
 * GameRenderer - Main Canvas Orchestrator
 *
 * Coordinates the rendering of all game layers:
 * 1. Background (Market candles, grid, environment)
 * 2. Projectiles (Bullets, trails)
 * 3. Entities (Player, Enemies, Gems)
 * 4. Effects (Shockwaves, screen shake, vignettes)
 * 5. HUD-like canvas overlays (Damage indicators)
 */
export class GameRenderer implements IGameRenderer {
  private backgroundRenderer: BackgroundRenderer;
  private entityRenderer: EntityRenderer;
  private projectileRenderer: ProjectileRenderer;
  private effectRenderer: EffectRenderer;

  constructor(
    background: BackgroundRenderer = new BackgroundRenderer(),
    entity: EntityRenderer = new EntityRenderer(),
    projectile: ProjectileRenderer = new ProjectileRenderer(),
    effect: EffectRenderer = new EffectRenderer()
  ) {
    this.backgroundRenderer = background;
    this.entityRenderer = entity;
    this.projectileRenderer = projectile;
    this.effectRenderer = effect;
  }

  /**
   * Primary render pass.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: GameState,
    player: Player,
    pool: IPoolManager,
    status: GameStatus,
    graphics: GraphicsConfig = {
      showParticles: true,
      showDamageNumbers: true,
      showScreenShake: true,
    }
  ): void {
    ctx.save();

    // 1. Screen Shake (if enabled and intensity > 0)
    if (graphics.showScreenShake && state.shake > 0) {
      ctx.translate(
        (Math.random() - GAME_ENGINE.SHAKE_CENTER_OFFSET) * state.shake,
        (Math.random() - GAME_ENGINE.SHAKE_CENTER_OFFSET) * state.shake
      );
    }

    // 2. Render Layers
    const opts = { width, height, status, graphics };
    this.backgroundRenderer.render(ctx, pool, state, player, opts);

    if (status !== GameStatus.MENU) {
      // Composition Order (bottom to top)
      this.projectileRenderer.render(ctx, pool, state, player, opts);
      this.entityRenderer.render(ctx, pool, state, player, opts);
      this.effectRenderer.render(ctx, pool, state, player, opts);

      this.drawDamageIndicators(ctx, state, player);

      // Near Miss Vignette Overlay (Visual feedback for slow-mo)
      if (state.nearMissTimer > 0) {
        // Calculate intensity based on timer progress
        const alpha =
          GAME_ENGINE.NEAR_MISS_MAX_INTENSITY *
          Math.min(1, state.nearMissTimer / GAME_ENGINE.NEAR_MISS_VIGNETTE_TIMER_DEC);

        const gradient = ctx.createRadialGradient(
          player.x,
          player.y,
          height * GAME_ENGINE.NEAR_MISS_GRADIENT_RADIUS_START,
          player.x,
          player.y,
          height * GAME_ENGINE.NEAR_MISS_GRADIENT_RADIUS_END
        );

        // Transparent center to dark outer edges
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);

        ctx.fillStyle = gradient;

        // Ensure rectangle covers screen even during shake
        ctx.fillRect(
          -state.shake * GAME_ENGINE.NEAR_MISS_VIGNETTE_SHAKE_FACTOR,
          -state.shake * GAME_ENGINE.NEAR_MISS_VIGNETTE_SHAKE_FACTOR,
          width + state.shake * GAME_ENGINE.NEAR_MISS_VIGNETTE_SIZE_OFFSET,
          height + state.shake * GAME_ENGINE.NEAR_MISS_VIGNETTE_SIZE_OFFSET
        );
      }
    }

    ctx.restore();
  }

  /**
   * Draws directional arrows indicating where damage came from.
   */
  private drawDamageIndicators(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    player: Player
  ): void {
    const now = TimeService.getGameTime();
    const duration = GAME_ENGINE.DAMAGE_INDICATOR_DURATION;

    for (let i = state.damageIndicators.length - 1; i >= 0; i--) {
      const indicator = state.damageIndicators[i];
      if (!indicator) {
        continue;
      }

      const elapsed = now - indicator.timestamp;

      if (elapsed > duration) {
        state.damageIndicators.splice(i, 1);
        continue;
      }

      const alpha = 1 - elapsed / duration;
      const angle = Math.atan2(
        indicator.sourceY - player.y,
        indicator.sourceX - player.x
      );

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(angle);

      // Draw curved indicator arc
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        GAME_ENGINE.DAMAGE_INDICATOR_RADIUS,
        -GAME_ENGINE.DAMAGE_INDICATOR_ARC_SWEEP,
        GAME_ENGINE.DAMAGE_INDICATOR_ARC_SWEEP
      );
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`; // Red-500
      ctx.lineWidth = GAME_ENGINE.DAMAGE_INDICATOR_LINE_WIDTH;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Arrow head (tip pointing towards source)
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(GAME_ENGINE.DAMAGE_INDICATOR_ARROW_TIP, 0);
      ctx.lineTo(
        GAME_ENGINE.DAMAGE_INDICATOR_ARROW_BASE,
        -GAME_ENGINE.DAMAGE_INDICATOR_ARROW_WIDTH
      );
      ctx.lineTo(
        GAME_ENGINE.DAMAGE_INDICATOR_ARROW_BASE,
        GAME_ENGINE.DAMAGE_INDICATOR_ARROW_WIDTH
      );
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  /**
   * Update background candle positions based on market trend and wave intensity.
   * Delegates logic to BackgroundRenderer.
   */
  public updateBackgroundCandles(
    state: GameState,
    pnl: number,
    waveMultiplier: number,
    _momentum: number,
    dtFactor: number,
    width: number,
    height: number
  ): void {
    this.backgroundRenderer.updateCandles(
      state,
      pnl,
      waveMultiplier,
      0,
      dtFactor,
      width,
      height
    );
  }
}
