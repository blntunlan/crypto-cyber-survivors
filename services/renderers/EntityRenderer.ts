import { IRenderer, RenderOptions } from './types';
import { PoolManager } from '../poolManager';
import { GameState, Player } from '../../types';
import { screenService } from '../ScreenService';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';

export class EntityRenderer implements IRenderer {
  private isMobileDevice: boolean;

  constructor() {
    this.isMobileDevice = screenService.isMobile();
  }

  render(
    ctx: CanvasRenderingContext2D,
    pool: PoolManager,
    state: GameState,
    player: Player,
    _opts: RenderOptions
  ): void {
    const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
    const shadowsEnabled = perfConfig.shadowsEnabled && !this.isMobileDevice;

    this.drawGems(ctx, pool, shadowsEnabled);
    this.drawEnemies(ctx, pool);
    this.drawPlayer(ctx, player, state, shadowsEnabled);
  }

  private drawGems(ctx: CanvasRenderingContext2D, pool: PoolManager, shadowsEnabled: boolean) {
    pool.activeGems.forEach(g => {
      if (g.isRare && shadowsEnabled) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = g.color;
      }
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(Math.round(g.x), Math.round(g.y), g.radius, 0, Math.PI * 2);
      ctx.fill();
      if (shadowsEnabled) ctx.shadowBlur = 0;
    });
  }

  private drawEnemies(ctx: CanvasRenderingContext2D, pool: PoolManager) {
    pool.activeEnemies.forEach(e => {
      const ex = Math.round(e.x);
      const ey = Math.round(e.y);
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(ex, ey, e.radius, 0, Math.PI * 2);
      ctx.fill();

      // Health Bar
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(ex - e.radius, ey - e.radius - 8, e.radius * 2, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(
        ex - e.radius,
        ey - e.radius - 8,
        e.radius * 2 * Math.max(0, e.health / e.maxHealth),
        4
      );
    });
  }

  private drawPlayer(
    ctx: CanvasRenderingContext2D,
    player: Player,
    state: GameState,
    shadowsEnabled: boolean
  ) {
    // Draw Dash Trail
    state.dashTrail.forEach((pos, i) => {
      ctx.globalAlpha = (i / state.dashTrail.length) * 0.4;
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(Math.round(pos.x), Math.round(pos.y), player.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (shadowsEnabled) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = player.color;
    }
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(Math.round(player.x), Math.round(player.y), player.radius, 0, Math.PI * 2);
    ctx.fill();
    if (shadowsEnabled) ctx.shadowBlur = 0;
  }
}
