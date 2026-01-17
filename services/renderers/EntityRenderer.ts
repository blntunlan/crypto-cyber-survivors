import { type IRenderer, type RenderOptions } from './types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { type GameState, type Player, type Enemy } from '../../types';
import { screenService } from '../ScreenService';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';
import { BuffGemSpawner } from '../spawners/BuffGemSpawner';
import {
  createViewportBounds,
  isCircleVisible,
  type ViewportBounds,
} from './CullingUtils';
import { ThemeService } from '../ThemeService';
import { GAME_ENGINE, GEMS } from '../../constants';

/**
 * EntityRenderer - Orchestrates the drawing of all primary game entities.
 *
 * Responsibilities:
 * 1. Rendering Player with squash-and-stretch animations and dash trails.
 * 2. Drawing Enemies with spawn-in "pop" effects and tiered death animations.
 * 3. Rendering standard and rare experience Gems with glowing effects.
 * 4. Drawing high-visibility Buff Gems with lifetime rings and pulsing animations.
 * 5. Implementing frustum culling for all entity types to maintain 60FPS.
 */
export class EntityRenderer implements IRenderer {
  private isMobileDevice: boolean;

  constructor() {
    this.isMobileDevice = screenService.isMobile();
  }

  /**
   * Primary render loop for game entities.
   */
  render(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    state: GameState,
    player: Player,
    opts: RenderOptions
  ): void {
    const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
    const shadowsEnabled = perfConfig.shadowsEnabled && !this.isMobileDevice;

    // Boundary Check: 50px padding to ensure smooth entry into screen
    const bounds = createViewportBounds(
      opts.width,
      opts.height,
      GAME_ENGINE.ENTITY_CULLING_PADDING
    );

    // Layered rendering (Bottom to Top)
    this.drawInteractables(ctx, pool, bounds);
    this.drawGems(ctx, pool, shadowsEnabled, bounds);
    this.drawBuffGems(ctx, shadowsEnabled, bounds);
    this.drawEnemies(ctx, pool, bounds);
    this.drawPlayer(ctx, player, state, shadowsEnabled);
  }

  /**
   * Renders interactive environmental objects (Lootboxes, Mining Rigs).
   */
  private drawInteractables(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    bounds: ViewportBounds
  ): void {
    pool.activeInteractables.forEach(obj => {
      if (!isCircleVisible(obj.x, obj.y, obj.radius + 10, bounds)) {
        return;
      }

      ctx.save();

      // Hit flash effect
      if (obj.isHit) {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = obj.color;
      }

      // Shake effect if hit
      const shakeX = obj.isHit ? (Math.random() - 0.5) * 4 : 0;
      const shakeY = obj.isHit ? (Math.random() - 0.5) * 4 : 0;

      const size = obj.radius * 2;
      const x = Math.round(obj.x + shakeX) - obj.radius;
      const y = Math.round(obj.y + shakeY) - obj.radius;

      // Draw Base (Box shape)
      ctx.fillRect(x, y, size, size);

      // Draw Detail (Icon or Border)
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, size, size);

      // Inner Icon
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `${Math.round(obj.radius)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const icon = obj.type === 'MINING_RIG' ? '⛏️' : '🎁';
      ctx.fillText(icon, Math.round(obj.x + shakeX), Math.round(obj.y + shakeY));

      // Health Bar (Mini)
      const healthPct = obj.health / obj.maxHealth;
      if (healthPct < 1) {
        ctx.fillStyle = '#111';
        ctx.fillRect(x, y - 8, size, 4);
        ctx.fillStyle = healthPct > 0.5 ? '#0f0' : '#f00';
        ctx.fillRect(x, y - 8, size * healthPct, 4);
      }

      ctx.restore();
    });
  }

  /**
   * Renders experience gems. Rare gems get a circular glow.
   */
  private drawGems(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    shadowsEnabled: boolean,
    bounds: ViewportBounds
  ): void {
    pool.activeGems.forEach(g => {
      if (!g.active) {
        return;
      }

      if (!isCircleVisible(g.x, g.y, g.radius, bounds)) {
        return;
      }

      // Calculate fade-out alpha based on lifetime
      const elapsed = g.elapsedLifetime ?? 0;
      const lifetime = GEMS.LIFETIME;
      const remainingRatio = Math.max(0, 1 - elapsed / lifetime);

      // Start fading when 30% of lifetime remains
      const fadeStartThreshold = 0.3;
      let alpha = 1.0;

      if (remainingRatio < fadeStartThreshold) {
        alpha = remainingRatio / fadeStartThreshold;
        // Add a "blinking" effect when very close to expiry
        if (remainingRatio < 0.1) {
          alpha *= Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
        }
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      if (g.isRare && shadowsEnabled) {
        ctx.shadowBlur = GAME_ENGINE.GEM_RARE_GLOW_BLUR;
        ctx.shadowColor = g.color;
      }

      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(Math.round(g.x), Math.round(g.y), g.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  /**
   * Renders tactical buff gems with life-cycle indicators.
   */
  private drawBuffGems(
    ctx: CanvasRenderingContext2D,
    shadowsEnabled: boolean,
    bounds: ViewportBounds
  ): void {
    const buffGems = BuffGemSpawner.getActiveGems();
    const now = Date.now();

    buffGems.forEach(gem => {
      if (!gem.active) {
        return;
      }

      // Culling with buffer for animations
      if (!isCircleVisible(gem.x, gem.y, gem.radius * 1.5 + 10, bounds)) {
        return;
      }

      const lifetimeRatio = BuffGemSpawner.getGemLifetimeRatio(gem);
      const isAlmostExpired = lifetimeRatio < 0.3;

      // Visual pulse logic (Market Volatility Style)
      const pulseScale = 1 + Math.sin(gem.pulsePhase) * GAME_ENGINE.BUFF_GEM_PULSE_AMP;
      const radius = gem.radius * pulseScale;

      // Danger flash when near expiry
      const flashAlpha = isAlmostExpired
        ? 0.5 + Math.sin(now * GAME_ENGINE.BUFF_GEM_FLASH_SPEED) * 0.3
        : 1;

      ctx.save();
      ctx.globalAlpha = flashAlpha * Math.max(0.3, lifetimeRatio);

      if (shadowsEnabled) {
        ctx.shadowBlur = GAME_ENGINE.BUFF_GEM_GLOW_BLUR;
        ctx.shadowColor = gem.color;
      }

      // 1. Outer Status Ring
      ctx.strokeStyle = gem.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        Math.round(gem.x),
        Math.round(gem.y),
        radius + GAME_ENGINE.BUFF_GEM_OUTER_RING_OFFSET,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      // 2. Main Gem Body
      ctx.fillStyle = gem.color;
      ctx.beginPath();
      ctx.arc(Math.round(gem.x), Math.round(gem.y), radius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Darkened Well for Icon
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(
        Math.round(gem.x),
        Math.round(gem.y),
        radius * GAME_ENGINE.BUFF_GEM_ICON_RADIUS_MULT,
        0,
        Math.PI * 2
      );
      ctx.fill();

      if (shadowsEnabled) {
        ctx.shadowBlur = 0;
      }

      // 4. Buff Icon (Emoji)
      ctx.font = `${Math.round(radius * 1.2)}px ${ThemeService.isRetro() ? 'VT323' : 'Arial'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = flashAlpha;
      ctx.fillText(gem.icon, Math.round(gem.x), Math.round(gem.y + 1));

      // 5. Sequential Expiration Ring (Countdown visualization)
      if (lifetimeRatio < 1) {
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = isAlmostExpired ? '#FF4444' : '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
          Math.round(gem.x),
          Math.round(gem.y),
          radius + GAME_ENGINE.BUFF_GEM_LIFETIME_RING_OFFSET,
          -Math.PI / 2,
          -Math.PI / 2 + lifetimeRatio * Math.PI * 2,
          false
        );
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  /**
   * Renders enemies with specialized spawn and death behaviors.
   */
  private drawEnemies(
    ctx: CanvasRenderingContext2D,
    pool: IPoolManager,
    bounds: ViewportBounds
  ): void {
    pool.activeEnemies.forEach(e => {
      // Visibility Check: Buffer for large spawn glows
      const spawnPadding =
        e.spawnTimer !== undefined &&
        e.spawnTimer > GAME_ENGINE.ENEMY_SPAWN_GLOW_THRESHOLD
          ? GAME_ENGINE.ENEMY_SPAWN_GLOW_PADDING
          : 0;

      if (!isCircleVisible(e.x, e.y, e.radius + 8 + spawnPadding, bounds)) {
        return;
      }

      if (e.isDying && e.deathProgress !== undefined) {
        this.renderEnemyDeath(ctx, e);
      } else {
        this.renderEnemyLiving(ctx, e);
      }
    });
  }

  /**
   * High-contrast "pop" effect for enemy elimination.
   */
  private renderEnemyDeath(ctx: CanvasRenderingContext2D, e: Enemy): void {
    ctx.save();

    // Scale up and fade out (expanding pop)
    const scale = 1 + e.deathProgress! * (GAME_ENGINE.ENEMY_DEATH_SCALE_MAX - 1);
    const alpha = 1 - e.deathProgress!;
    ctx.globalAlpha = alpha;

    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(Math.round(e.x), Math.round(e.y), e.radius * scale, 0, Math.PI * 2);
    ctx.fill();

    // Sudden white core flash
    const flashMax = GAME_ENGINE.ENEMY_DEATH_FLASH_RADIUS_MULT;
    const flashAlpha = (1 - e.deathProgress!) * 0.6;
    if (flashAlpha > 0.05) {
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(
        Math.round(e.x),
        Math.round(e.y),
        e.radius * scale * flashMax,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Handles normal state and spawn-in "pop" logic for enemies.
   */
  private renderEnemyLiving(ctx: CanvasRenderingContext2D, e: Enemy): void {
    const ex = Math.round(e.x);
    const ey = Math.round(e.y);

    ctx.save();
    ctx.translate(ex, ey);

    // 1. Spawn Animation (Elastic scaling + burst)
    if (e.spawnTimer !== undefined && e.spawnTimer > 0) {
      this.applyEnemySpawnTransform(ctx, e);
    }

    // 2. Theme-Specific Skins
    if (ThemeService.isRetro()) {
      const sizeRect = e.radius * GAME_ENGINE.ENEMY_RETRO_SIZE_MULT;
      ctx.fillStyle = e.color;
      ctx.fillRect(-sizeRect / 2, -sizeRect / 2, sizeRect, sizeRect);

      // Retro detail: Eye/Core highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(-sizeRect / 2 + 2, -sizeRect / 2 + 2, 4, 4);
    } else {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // 3. Health Bar (Overlays)
    if (e.spawnTimer === undefined || e.spawnTimer < 0.7) {
      this.drawEnemyHealthBar(ctx, e, ex, ey);
    }
  }

  /**
   * Calculates elastic squash/stretch for enemy entry.
   */
  private applyEnemySpawnTransform(ctx: CanvasRenderingContext2D, e: Enemy): void {
    const t = 1 - e.spawnTimer!;
    let sx = 1;
    let sy = 1;
    let extraScale = 1;

    // Phase Transitions defined in constants
    const phase1End = GAME_ENGINE.ENEMY_SPAWN_POP_ELASTIC;
    const phase2End = GAME_ENGINE.ENEMY_SPAWN_BOUNCE_END;

    if (t < phase1End) {
      const p = t / phase1End;
      const elastic = 1 - Math.pow(1 - p, 3) * Math.cos(p * Math.PI * 0.5);
      extraScale = 0.2 + elastic * 1.0;
      sx = 0.3 + elastic * 0.9;
      sy = 0.3 + elastic * 0.9;
    } else if (t < phase2End) {
      const p = (t - phase1End) / (phase2End - phase1End);
      extraScale = 1.2 - p * 0.25;
      sx = 1.15 - p * 0.25;
      sy = 0.85 + p * 0.25;
    } else {
      const p = (t - phase2End) / (1 - phase2End);
      extraScale = 0.95 + p * 0.05;
      const damp = Math.pow(1 - p, 1.5);
      const wobble =
        Math.sin(p * Math.PI * GAME_ENGINE.ENEMY_SPAWN_WOBBLE_FREQ) * 0.1 * damp;
      sx = 1 + wobble;
      sy = 1 - wobble;
    }

    ctx.scale(sx * extraScale, sy * extraScale);

    // Initial shockwave burst
    if (t < GAME_ENGINE.ENEMY_SPAWN_BURST_DURATION) {
      const p = t / GAME_ENGINE.ENEMY_SPAWN_BURST_DURATION;
      const alpha = 1 - p;
      const burstRadius =
        e.radius *
        (GAME_ENGINE.ENEMY_SPAWN_BURST_RADIUS_MIN +
          p * GAME_ENGINE.ENEMY_SPAWN_BURST_RADIUS_MAX);

      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      ctx.lineWidth = 4 * (1 - p);
      ctx.arc(0, 0, burstRadius / extraScale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Smooth entry fade
    if (t < 0.1) {
      ctx.globalAlpha = t * 10;
    }
  }

  /**
   * Simple progress-bar style health indicator.
   */
  private drawEnemyHealthBar(
    ctx: CanvasRenderingContext2D,
    e: Enemy,
    ex: number,
    ey: number
  ): void {
    const barWidth = e.radius * 2;
    const barY = ey - e.radius - 8;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(ex - e.radius, barY, barWidth, 4);

    // Theme-aware health bar color
    const healthColor = ThemeService.getConfig().colors.health;
    ctx.fillStyle = healthColor;
    ctx.fillRect(
      ex - e.radius,
      barY,
      barWidth * Math.max(0, e.health / e.maxHealth),
      4
    );
  }

  /**
   * Optimized player rendering with squash and state visual effects.
   */
  private drawPlayer(
    ctx: CanvasRenderingContext2D,
    player: Player,
    state: GameState,
    shadowsEnabled: boolean
  ): void {
    // 1. Render Dash Ghosting/Trail (Theme-aware)
    const isRetro = ThemeService.isRetro();

    state.dashTrail.forEach((pos, i) => {
      const progress = i / state.dashTrail.length;
      ctx.globalAlpha = progress * 0.4;

      // Use player's current color (based on Market Position) for the trail
      // This ensures Green trail for Long, Red for Short.
      ctx.fillStyle = player.color;

      if (isRetro) {
        // Retro 16-bit: Pixelated square afterimage
        const size = player.radius * 2 * (0.6 + progress * 0.4);
        ctx.fillRect(
          Math.round(pos.x) - size / 2,
          Math.round(pos.y) - size / 2,
          size,
          size
        );
      } else {
        // Cyberpunk: Neon trail with glow
        ctx.beginPath();
        ctx.arc(
          Math.round(pos.x),
          Math.round(pos.y),
          player.radius * (0.7 + progress * 0.3),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;

    // 2. Dash Feedback Halo
    if (state.dashHaloOpacity > 0) {
      this.renderPlayerHalo(ctx, player, state, shadowsEnabled);
    }

    // 3. Main Character Body
    if (shadowsEnabled) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = player.color;
    }

    if (ThemeService.isRetro()) {
      this.renderRetroPlayer(ctx, player);
    } else {
      this.renderCyberpunkPlayer(ctx, player, state);
    }

    if (shadowsEnabled) {
      ctx.shadowBlur = 0;
    }
  }

  /**
   * Pumping glow rings for double-dash window (Theme-aware).
   */
  private renderPlayerHalo(
    ctx: CanvasRenderingContext2D,
    player: Player,
    state: GameState,
    shadowsEnabled: boolean
  ): void {
    ctx.save();
    const haloRadius = player.radius * GAME_ENGINE.PLAYER_HALO_RADIUS_MULT;
    const opac = state.dashHaloOpacity;
    const isRetro = ThemeService.isRetro();

    const pColor = player.color;

    if (isRetro) {
      // Retro 16-bit: High-contrast blinking squared halo
      const size = haloRadius * 2;
      const px = Math.round(player.x);
      const py = Math.round(player.y);

      // A. Outer square ring (White for visibility)
      ctx.globalAlpha = opac * 0.8;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.strokeRect(px - size / 2, py - size / 2, size, size);

      // B. Inner square ring (Player color)
      const innerSize = size - 8;
      ctx.globalAlpha = opac * 0.6;
      ctx.strokeStyle = pColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(px - innerSize / 2, py - innerSize / 2, innerSize, innerSize);
    } else {
      // Cyberpunk: High-energy neon glow rings based on player state

      // A. Critical Momentum Ring (White core)
      ctx.globalAlpha = opac * 0.8;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(Math.round(player.x), Math.round(player.y), haloRadius, 0, Math.PI * 2);
      ctx.stroke();

      // B. Energy Burst Ring (Player color)
      ctx.globalAlpha = opac * 0.5;
      ctx.strokeStyle = pColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(
        Math.round(player.x),
        Math.round(player.y),
        haloRadius + 4,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      // C. Radial Field Glow
      if (shadowsEnabled) {
        ctx.globalAlpha = opac * 0.3;
        const gradient = ctx.createRadialGradient(
          player.x,
          player.y,
          player.radius,
          player.x,
          player.y,
          haloRadius + 10
        );
        gradient.addColorStop(0, `${pColor}80`);
        gradient.addColorStop(1, `${pColor}00`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(
          Math.round(player.x),
          Math.round(player.y),
          haloRadius + 10,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * 16-bit square player avatar.
   */
  private renderRetroPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
    const size = player.radius * 2;
    const px = Math.round(player.x) - size / 2;
    const py = Math.round(player.y) - size / 2;

    // High-visibility outline
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(px, py, size, size);

    ctx.fillStyle = player.color;
    ctx.fillRect(px, py, size, size);

    // Character Detail: Simple 8-bit eyes
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(Math.round(player.x) - 6, Math.round(player.y) - 2, 4, 4);
    ctx.fillRect(Math.round(player.x) + 2, Math.round(player.y) - 2, 4, 4);
  }

  /**
   * Smooth vector player with physics-based squash/stretch.
   */
  private renderCyberpunkPlayer(
    ctx: CanvasRenderingContext2D,
    player: Player,
    state: GameState
  ): void {
    const px = Math.round(player.x);
    const py = Math.round(player.y);

    // Stylized Spotlight logic
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.arc(
      px,
      py,
      player.radius * GAME_ENGINE.PLAYER_SPOTLIGHT_RADIUS_MULT,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = player.color;
    ctx.beginPath();

    // Apply scaling factor for impact/movement "feel"
    if (
      Math.abs(state.playerScaleX - 1) > 0.001 ||
      Math.abs(state.playerScaleY - 1) > 0.001
    ) {
      ctx.ellipse(
        px,
        py,
        player.radius * state.playerScaleX,
        player.radius * state.playerScaleY,
        state.playerRotation,
        0,
        Math.PI * 2
      );
    } else {
      ctx.arc(px, py, player.radius, 0, Math.PI * 2);
    }

    ctx.fill();
  }
}
