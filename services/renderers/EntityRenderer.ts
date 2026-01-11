import { type IRenderer, type RenderOptions } from './types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type GameState, type Player } from '../../types';
import { screenService } from '../ScreenService';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';
import { BuffGemSpawner } from '../spawners/BuffGemSpawner';
import {
  createViewportBounds,
  isCircleVisible,
  type ViewportBounds,
} from './CullingUtils';
import { ThemeService } from '../ThemeService';
import { COLORS } from '../../config/Colors';

export class EntityRenderer implements IRenderer {
  private isMobileDevice: boolean;

  constructor() {
    this.isMobileDevice = screenService.isMobile();
  }

  render(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    state: GameState,
    player: Player,
    opts: RenderOptions
  ): void {
    const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
    const shadowsEnabled = perfConfig.shadowsEnabled && !this.isMobileDevice;

    // Create viewport bounds for culling (with 50px padding to prevent pop-in)
    const bounds = createViewportBounds(opts.width, opts.height, 50);

    this.drawGems(ctx, pool, shadowsEnabled, bounds);
    this.drawBuffGems(ctx, shadowsEnabled, bounds);
    this.drawEnemies(ctx, pool, bounds);
    this.drawPlayer(ctx, player, state, shadowsEnabled);
  }

  private drawGems(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    shadowsEnabled: boolean,
    bounds: ViewportBounds
  ) {
    pool.activeGems.forEach(g => {
      // Off-screen culling
      if (!isCircleVisible(g.x, g.y, g.radius, bounds)) return;

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

  private drawBuffGems(
    ctx: CanvasRenderingContext2D,
    shadowsEnabled: boolean,
    bounds: ViewportBounds
  ) {
    const buffGems = BuffGemSpawner.getActiveGems();
    const now = Date.now();

    buffGems.forEach(gem => {
      if (!gem.active) return;

      // Off-screen culling (use larger radius for pulse effect)
      if (!isCircleVisible(gem.x, gem.y, gem.radius * 1.5 + 10, bounds)) return;

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
      ctx.font = `${Math.round(radius * 1.2)}px ${ThemeService.isRetro() ? 'VT323' : 'Arial'}`;
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

  private drawEnemies(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    bounds: ViewportBounds
  ) {
    pool.activeEnemies.forEach(e => {
      // Off-screen culling (larger radius for spawn animation glow effect)
      const spawnGlowExtra = e.spawnTimer !== undefined && e.spawnTimer > 0.6 ? 30 : 0;
      if (!isCircleVisible(e.x, e.y, e.radius + 8 + spawnGlowExtra, bounds)) return;

      const ex = Math.round(e.x);
      const ey = Math.round(e.y);

      // Death Pop Animation
      if (e.isDying && e.deathProgress !== undefined) {
        ctx.save();

        // Scale up (1.0 → 1.4) and fade out
        const scale = 1 + e.deathProgress * 0.4;
        const alpha = 1 - e.deathProgress;

        ctx.globalAlpha = alpha;

        // Draw scaled enemy
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(ex, ey, e.radius * scale, 0, Math.PI * 2);
        ctx.fill();

        // White flash overlay (strongest at start)
        const flashAlpha = (1 - e.deathProgress) * 0.6;
        if (flashAlpha > 0.05) {
          ctx.globalAlpha = flashAlpha;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(ex, ey, e.radius * scale * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        return; // Skip normal rendering
      }

      ctx.save();
      ctx.translate(ex, ey);

      // Spawn Animation - Ball Squeeze Pop Effect
      // Enemy looks like it's compressed into a ball and pops out
      if (e.spawnTimer !== undefined && e.spawnTimer > 0) {
        const t = 1 - e.spawnTimer; // 0 to 1 (progress)
        let sx = 1;
        let sy = 1;
        let extraScale = 1;

        // Phase 1: Compressed ball rapidly expanding (0 -> 0.25)
        if (t < 0.25) {
          const p = t / 0.25;
          // Elastic ease out for "pop" feeling
          const elastic = 1 - Math.pow(1 - p, 3) * Math.cos(p * Math.PI * 0.5);

          // Start as tiny compressed ball, expand to overshoot
          extraScale = 0.2 + elastic * 1.0; // 0.2 -> 1.2
          sx = 0.3 + elastic * 0.9; // Slightly wider as it pops
          sy = 0.3 + elastic * 0.9;
        }
        // Phase 2: Overshoot bounce (0.25 -> 0.5)
        else if (t < 0.5) {
          const p = (t - 0.25) / 0.25;
          extraScale = 1.2 - p * 0.25; // 1.2 -> 0.95

          // Squash horizontally, stretch vertically (jelly effect)
          sx = 1.15 - p * 0.25; // 1.15 -> 0.9
          sy = 0.85 + p * 0.25; // 0.85 -> 1.1
        }
        // Phase 3: Settle with wobble (0.5 -> 1.0)
        else {
          const p = (t - 0.5) / 0.5;
          extraScale = 0.95 + p * 0.05; // 0.95 -> 1.0

          // Damped oscillation
          const damp = Math.pow(1 - p, 1.5);
          const wobble = Math.sin(p * Math.PI * 3) * 0.1 * damp;
          sx = 1 + wobble;
          sy = 1 - wobble;
        }

        ctx.scale(sx * extraScale, sy * extraScale);

        // Spawn burst effect - expanding ring
        if (t < 0.35) {
          const burstProgress = t / 0.35;
          const burstAlpha = 1 - burstProgress;
          const burstRadius = e.radius * (0.5 + burstProgress * 2.5);

          // White flash ring
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255, 255, 255, ${burstAlpha * 0.8})`;
          ctx.lineWidth = 4 * (1 - burstProgress);
          ctx.arc(0, 0, burstRadius / extraScale, 0, Math.PI * 2);
          ctx.stroke();

          // Inner glow
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 200, 150, ${burstAlpha * 0.5})`;
          ctx.arc(0, 0, (e.radius * 0.8) / extraScale, 0, Math.PI * 2);
          ctx.fill();
        }

        // Instant appear (no slow fade)
        if (t < 0.1) ctx.globalAlpha = t * 10;
      }

      // Draw enemy - pixel mode or normal
      if (ThemeService.isRetro()) {
        // 16-bit pixel style - draw as rounded square
        const size = e.radius * 1.8;
        const halfSize = size / 2;
        ctx.fillStyle = e.color;
        ctx.fillRect(-halfSize, -halfSize, size, size);

        // Add pixel-style inner details
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(-halfSize + 2, -halfSize + 2, 4, 4); // Eye highlight
      } else {
        // Cyberpunk style - smooth circle
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Health Bar (only for alive enemies, hide during early spawn)
      const showHealthBar = e.spawnTimer === undefined || e.spawnTimer < 0.7;
      if (showHealthBar) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(ex - e.radius, ey - e.radius - 8, e.radius * 2, 4);
        ctx.fillStyle = ThemeService.isRetro() ? COLORS.CASINO_RED : COLORS.SHORT;
        ctx.fillRect(
          ex - e.radius,
          ey - e.radius - 8,
          e.radius * 2 * Math.max(0, e.health / e.maxHealth),
          4
        );
      }
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

    // Draw Double Dash Halo Effect (when dash window is active)
    if (state.dashHaloOpacity > 0) {
      ctx.save();

      // Outer pulsing ring - indicates double dash window (JACKPOT_YELLOW)
      const haloRadius = player.radius * 2.5;
      ctx.globalAlpha = state.dashHaloOpacity * 0.6;
      ctx.strokeStyle = COLORS.JACKPOT_YELLOW;
      ctx.lineWidth = ThemeService.isRetro() ? 4 : 3;
      ctx.beginPath();
      ctx.arc(Math.round(player.x), Math.round(player.y), haloRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glow ring (CASINO_GOLD)
      ctx.globalAlpha = state.dashHaloOpacity * 0.4;
      ctx.strokeStyle = COLORS.CASINO_GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        Math.round(player.x),
        Math.round(player.y),
        haloRadius - 5,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      // Radial glow effect (JACKPOT_YELLOW gradient)
      if (shadowsEnabled) {
        ctx.globalAlpha = state.dashHaloOpacity * 0.3;
        const gradient = ctx.createRadialGradient(
          player.x,
          player.y,
          player.radius,
          player.x,
          player.y,
          haloRadius
        );
        gradient.addColorStop(0, 'rgba(255, 214, 0, 0.5)'); // JACKPOT_YELLOW
        gradient.addColorStop(1, 'rgba(255, 214, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(Math.round(player.x), Math.round(player.y), haloRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    if (shadowsEnabled) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = player.color;
    }

    // Draw Squash & Stretch Player
    const scaleX = state.playerScaleX;
    const scaleY = state.playerScaleY;

    // Draw Player - pixel mode or normal
    if (ThemeService.isRetro()) {
      // 16-bit pixel style - draw as square with details
      const size = player.radius * 2;
      const halfSize = size / 2;

      // High-visibility outline for Retro mode
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeRect(
        Math.round(player.x) - halfSize,
        Math.round(player.y) - halfSize,
        size,
        size
      );

      ctx.fillStyle = player.color;
      ctx.fillRect(
        Math.round(player.x) - halfSize,
        Math.round(player.y) - halfSize,
        size,
        size
      );

      // Add pixel-style inner details (eyes/face)
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      const eyeSize = 4;
      const eyeY = Math.round(player.y) - 2;
      ctx.fillRect(Math.round(player.x) - 6, eyeY, eyeSize, eyeSize);
      ctx.fillRect(Math.round(player.x) + 2, eyeY, eyeSize, eyeSize);
    } else {
      // Cyberpunk style - smooth ellipse with squash & stretch

      // Under-glow for better visibility in chaos
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Subtle spotlight
      ctx.arc(
        Math.round(player.x),
        Math.round(player.y),
        player.radius * 1.3,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle = player.color;
      ctx.beginPath();

      if (Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01) {
        // Use ellipse for squash & stretch
        ctx.ellipse(
          Math.round(player.x),
          Math.round(player.y),
          player.radius * scaleX,
          player.radius * scaleY,
          0,
          0,
          Math.PI * 2
        );
      } else {
        // Standard circle optimization
        ctx.arc(
          Math.round(player.x),
          Math.round(player.y),
          player.radius,
          0,
          Math.PI * 2
        );
      }

      ctx.fill();
    }
    if (shadowsEnabled) ctx.shadowBlur = 0;
  }
}
