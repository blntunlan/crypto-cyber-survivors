import { GameStatus, type Player, type GameState } from '../types';
import { type PoolManager } from './PoolManager';
import {
  BackgroundRenderer,
  EntityRenderer,
  ProjectileRenderer,
  EffectRenderer,
} from './renderers';
import { type GraphicsConfig } from './renderers/types';

export class GameRenderer {
  private backgroundRenderer: BackgroundRenderer;
  private entityRenderer: EntityRenderer;
  private projectileRenderer: ProjectileRenderer;
  private effectRenderer: EffectRenderer;

  constructor() {
    this.backgroundRenderer = new BackgroundRenderer();
    this.entityRenderer = new EntityRenderer();
    this.projectileRenderer = new ProjectileRenderer();
    this.effectRenderer = new EffectRenderer();
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: GameState,
    player: Player,
    pool: PoolManager,
    status: GameStatus,
    graphics: GraphicsConfig = {
      showParticles: true,
      showDamageNumbers: true,
      showScreenShake: true,
    }
  ) {
    ctx.save();

    // 1. Screen Shake (only if enabled)
    if (graphics.showScreenShake && state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }

    // 2. Render Layers
    const opts = { width, height, status, graphics };
    this.backgroundRenderer.render(ctx, pool, state, player, opts);

    if (status !== GameStatus.MENU) {
      // Note: Order matters for z-index
      this.projectileRenderer.render(ctx, pool, state, player, opts);
      this.entityRenderer.render(ctx, pool, state, player, opts);
      this.effectRenderer.render(ctx, pool, state, player, opts);

      this.drawDamageIndicators(ctx, state, player);

      // Near Miss Vignette Overlay (Dark edges for tension)
      if (state.nearMissTimer > 0) {
        // Calculate intensity based on timer (fade out at end)
        // Max Intensity: 0.7
        const alpha = 0.7 * Math.min(1, state.nearMissTimer / 100);

        const gradient = ctx.createRadialGradient(
          player.x,
          player.y,
          height * 0.2,
          player.x,
          player.y,
          height * 0.9
        );

        // Transparent center to dark outer edges
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);

        ctx.fillStyle = gradient;
        // Draw fullscreen rect (but translate back if shake is active)
        ctx.fillRect(
          -state.shake * 2,
          -state.shake * 2,
          width + state.shake * 4,
          height + state.shake * 4
        );
      }
    }

    ctx.restore();
  }

  private drawDamageIndicators(ctx: CanvasRenderingContext2D, state: GameState, player: Player) {
    const now = Date.now();
    const duration = 1000;

    for (let i = state.damageIndicators.length - 1; i >= 0; i--) {
      const indicator = state.damageIndicators[i];
      if (!indicator) continue;
      const elapsed = now - indicator.timestamp;

      if (elapsed > duration) {
        state.damageIndicators.splice(i, 1);
        continue;
      }

      const alpha = 1 - elapsed / duration;
      const angle = Math.atan2(indicator.sourceY - player.y, indicator.sourceX - player.x);

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(angle);

      // Draw red curved indicator pointing towards danger
      ctx.beginPath();
      ctx.arc(0, 0, 50, -0.3, 0.3); // Distance 50
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`; // Red-500
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Arrow head
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(56, 0); // Tip at 56
      ctx.lineTo(46, -6);
      ctx.lineTo(46, 6);
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
    dtFactor: number,
    width: number,
    height: number
  ): void {
    this.backgroundRenderer.updateCandles(
      state,
      pnl,
      waveMultiplier,
      0, // unused parameter for API compatibility
      dtFactor,
      width,
      height
    );
  }
}
