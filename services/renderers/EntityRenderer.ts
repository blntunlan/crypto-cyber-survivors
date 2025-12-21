import { type IRenderer, type RenderOptions } from './types';
import { type PoolManager } from '../poolManager';
import { type GameState, type Player } from '../../types';
import { screenService } from '../ScreenService';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';
import { BuffGemSpawner } from '../spawners/BuffGemSpawner';

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
    this.drawBuffGems(ctx, shadowsEnabled);
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

  private drawBuffGems(ctx: CanvasRenderingContext2D, shadowsEnabled: boolean) {
    const buffGems = BuffGemSpawner.getActiveGems();
    const now = Date.now();

    buffGems.forEach(gem => {
      if (!gem.active) return;

      // Calculate lifetime ratio for fade effect
      const lifetimeRatio = BuffGemSpawner.getGemLifetimeRatio(gem);
      const isAlmostExpired = lifetimeRatio < 0.3;

      // Pulse animation
      const pulseScale = 1 + Math.sin(gem.pulsePhase) * 0.15;
      const radius = gem.radius * pulseScale;

      // Flash when almost expired
      const flashAlpha = isAlmostExpired ? 0.5 + Math.sin(now * 0.02) * 0.3 : 1;

      ctx.save();
      ctx.globalAlpha = flashAlpha * Math.max(0.3, lifetimeRatio);

      // Glow effect
      if (shadowsEnabled) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = gem.color;
      }

      // Outer ring
      ctx.strokeStyle = gem.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(Math.round(gem.x), Math.round(gem.y), radius + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Inner filled circle
      ctx.fillStyle = gem.color;
      ctx.beginPath();
      ctx.arc(Math.round(gem.x), Math.round(gem.y), radius, 0, Math.PI * 2);
      ctx.fill();

      // Dark center for icon
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(Math.round(gem.x), Math.round(gem.y), radius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      if (shadowsEnabled) ctx.shadowBlur = 0;

      // Draw icon (emoji)
      ctx.font = `${Math.round(radius * 1.2)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = flashAlpha;
      ctx.fillText(gem.icon, Math.round(gem.x), Math.round(gem.y + 1));

      // Lifetime indicator ring
      if (lifetimeRatio < 1) {
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = isAlmostExpired ? '#FF4444' : '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
          Math.round(gem.x),
          Math.round(gem.y),
          radius + 8,
          -Math.PI / 2,
          -Math.PI / 2 + lifetimeRatio * Math.PI * 2,
          false
        );
        ctx.stroke();
      }

      ctx.restore();
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
