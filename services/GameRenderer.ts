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
    }

    ctx.restore();
  }

  /**
   * Update background candle positions based on market trend.
   * Delegates logic to BackgroundRenderer.
   */
  public updateBackgroundCandles(
    state: GameState,
    pnl: number,
    difficulty: number,
    dtFactor: number,
    width: number,
    height: number
  ): void {
    this.backgroundRenderer.updateCandles(state, pnl, difficulty, dtFactor, width, height);
  }
}
