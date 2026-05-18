import { GameStatus, type Player, type GameState } from '../../types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import {
  BackgroundRenderer,
  EntityRenderer,
  ProjectileRenderer,
  EffectRenderer,
} from './';
import { ThemeService } from '../system/ThemeService';
import { type GraphicsConfig } from '../renderers/types';
import { type IGameRenderer } from '../interfaces/IGameRenderer';
import { GAME_ENGINE } from '../../constants';
import { portalSystem } from '../gameplay/PortalSystem';

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
  private static instance: GameRenderer | null = null;
  private backgroundRenderer: BackgroundRenderer;
  private entityRenderer: EntityRenderer;
  private projectileRenderer: ProjectileRenderer;
  private effectRenderer: EffectRenderer;

  public static getInstance(): GameRenderer {
    return (GameRenderer.instance ??= new GameRenderer());
  }

  private constructor(
    background: BackgroundRenderer = new BackgroundRenderer(),
    entity: EntityRenderer = new EntityRenderer(),
    projectile: ProjectileRenderer = ProjectileRenderer.getInstance(),
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
      disableGlow: false,
    }
  ): void {
    ctx.save();

    // 1. Screen Shake (if enabled and intensity > 0)
    if (status === GameStatus.PLAYING && graphics.showScreenShake && state.shake > 0) {
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

      // this.drawDamageIndicators(ctx, state, player);

      // Near Miss Vignette Overlay
      if (state.nearMissTimer > 0) {
        const isRetro = ThemeService.isRetro();
        // Calculate intensity based on timer progress
        const alpha =
          GAME_ENGINE.NEAR_MISS_MAX_INTENSITY *
          Math.min(1, state.nearMissTimer / GAME_ENGINE.NEAR_MISS_VIGNETTE_TIMER_DEC);

        if (isRetro) {
          // Retro: Simple thick border instead of radial gradient
          ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
          ctx.lineWidth = 60;
          ctx.strokeRect(0, 0, width, height);
        } else {
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
    }

    this.drawPortal(ctx, state, Boolean(graphics.disableGlow));

    ctx.restore();
  }

  private drawPortal(
    ctx: CanvasRenderingContext2D,
    _state: GameState,
    disableGlow: boolean
  ): void {
    const portal = portalSystem.getState();
    if (!portal.isActive) return;

    const { x, y, radius, type } = portal;
    const time = Date.now() / 1000;

    ctx.save();
    ctx.translate(x, y);

    // 1. Outer Swirls
    const layers = 3;
    for (let i = 0; i < layers; i++) {
      const rot = time * (1.5 + i) * (type === 'TAKE_PROFIT' ? 1 : -1);
      ctx.beginPath();
      ctx.rotate(rot);
      const gradient = ctx.createRadialGradient(
        0,
        0,
        radius * 0.2,
        0,
        0,
        radius * (1 + i * 0.2)
      );

      if (type === 'TAKE_PROFIT') {
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(255, 68, 68, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 68, 68, 0)');
      }

      ctx.fillStyle = gradient;
      ctx.arc(0, 0, radius * (1 + i * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Black Hole Center
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    if (!disableGlow) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = type === 'TAKE_PROFIT' ? '#00FF88' : '#FF4444';
    }
    ctx.fill();

    // 3. Extraction Progress Text (Optional/Visual)
    ctx.restore();
  }

  /*
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
  */

  /**
   * Update background candle positions based on market trend and wave intensity.
   * Delegates logic to BackgroundRenderer.
   */
  public updateBackgroundCandles(
    state: GameState,
    pnl: number,
    waveMultiplier: number,
    momentum: number,
    dtFactor: number,
    width: number,
    height: number
  ): void {
    this.backgroundRenderer.updateCandles(
      state,
      pnl,
      waveMultiplier,
      momentum,
      dtFactor,
      width,
      height
    );
  }
}
