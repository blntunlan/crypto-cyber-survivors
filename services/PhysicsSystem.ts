import { type Player, type GameState, type Enemy } from '../types';
import { type PoolManager } from './poolManager';
import { CheatManager } from './CheatManager';
import { audio } from './audioService';
import { EventBus } from './EventBus';
import { DifficultyManager } from './DifficultyManager';
import { ComboSystem } from './ComboSystem';
import { COLORS, GAME_ENGINE } from '../constants';
import { bulletGrid, enemyGrid } from './SpatialGrid';
import { DeviceBenchmarkService } from './DeviceBenchmarkService';
import { ParticleConfigService } from './ParticleConfigService';
import { BuffGemSpawner } from './spawners/BuffGemSpawner';
import { BuffManager } from './patterns/decorators/BuffManager';
import { lerp } from '../utils/math';

export class PhysicsSystem {
  public static updateEntities(p: PoolManager, dtFactor: number, width: number, height: number) {
    // 1. Update Bullets
    const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
    p.activeBullets.forEach(b => {
      b.x += b.vx * dtFactor;
      b.y += b.vy * dtFactor;

      // TRAIL EFFECT: Spawn small particles behind bullets periodically
      const trailCfg = ParticleConfigService.trail;
      if (Math.random() < trailCfg.spawnChance * perfConfig.particleMultiplier) {
        const offX = (Math.random() - 0.5) * 4;
        const offY = (Math.random() - 0.5) * 4;
        const trailPart = p.getParticle(
          b.x + offX,
          b.y + offY,
          -b.vx * trailCfg.speedMultiplier,
          -b.vy * trailCfg.speedMultiplier,
          b.color
        );
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- part can be undefined in tests
        if (trailPart) {
          trailPart.life = trailCfg.life;
          trailPart.radius = b.radius * trailCfg.radiusMultiplier;
        }
      }

      if (b.x < -100 || b.x > width + 100 || b.y < -100 || b.y > height + 100) {
        b.active = false;
      }
    });

    // 2. Update Particles
    p.activeParticles.forEach(part => {
      part.x += part.vx * dtFactor;
      part.y += part.vy * dtFactor;
      part.life -= 0.02 * dtFactor;
      if (part.life <= 0) part.active = false;
    });

    // 3. Update Floating Texts
    p.activeFloatingTexts.forEach(t => {
      t.y -= 1.5 * dtFactor;
      t.life -= 0.025 * dtFactor;
      if (t.life <= 0) t.active = false;
    });
  }

  public static handleCollisions(
    p: PoolManager,
    player: Player,
    s: GameState,
    dtFactor: number,
    width: number,
    height: number,
    onGameOver: () => void
  ) {
    // Build spatial grids for this frame
    bulletGrid.clear();
    enemyGrid.clear();
    bulletGrid.insertAll(p.activeBullets);
    enemyGrid.insertAll(p.activeEnemies);

    // 1. Player vs Enemy Collisions + Enemy Movement
    p.activeEnemies.forEach(e => {
      // Off-screen culling
      if (
        e.x < -GAME_ENGINE.ENEMY_OFFSCREEN_THRESHOLD ||
        e.x > width + GAME_ENGINE.ENEMY_OFFSCREEN_THRESHOLD ||
        e.y < -GAME_ENGINE.ENEMY_OFFSCREEN_THRESHOLD ||
        e.y > height + GAME_ENGINE.ENEMY_OFFSCREEN_THRESHOLD
      ) {
        e.active = false;
        return;
      }

      e.behavior.move(e, player.x, player.y, dtFactor);

      // Optimized: Use squared distance
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const playerEnemyDistSq = dx * dx + dy * dy;
      const playerEnemyCombined = player.radius + e.radius;

      if (playerEnemyDistSq < playerEnemyCombined * playerEnemyCombined) {
        if (!CheatManager.isGodMode() && !s.isDashing) {
          player.hp -= Math.max(0.1, 0.8 - player.armor * 0.05) * dtFactor;
          player.hp = Math.max(0, player.hp); // Floor HP at 0
          s.shake = 10;
          if (Math.random() > 0.9) audio.playHit();
          // Prevent multiple game over calls
          if (player.hp <= 0 && !s.isGameOverTriggered) {
            s.isGameOverTriggered = true;
            onGameOver();
          }
        }
      }

      // 2. Bullet vs Enemy Collisions - NOW WITH SPATIAL GRID
      // Only check bullets in nearby cells instead of ALL bullets
      const nearbyBullets = bulletGrid.getNearby(e.x, e.y);

      for (const b of nearbyBullets) {
        if (!e.active || !b.active) continue;

        const bDx = e.x - b.x;
        const bDy = e.y - b.y;
        const distSq = bDx * bDx + bDy * bDy;
        const combinedRadius = e.radius + b.radius;

        if (distSq < combinedRadius * combinedRadius) {
          const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
          e.health -= b.damage;
          b.active = false;

          // IMPACT PARTICLES: Small burst when bullet hits enemy
          const impactCfg = ParticleConfigService.impact;
          const impactCount = Math.round(impactCfg.count * perfConfig.particleMultiplier);
          for (let i = 0; i < impactCount; i++) {
            const part = p.getParticle(
              b.x,
              b.y,
              (Math.random() - 0.5) * impactCfg.speed,
              (Math.random() - 0.5) * impactCfg.speed,
              b.isSuperCrit ? COLORS.SUPER_CRIT : b.color
            );
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- part can be undefined in tests
            if (part) part.life = impactCfg.life;
          }

          // Knockback: push enemy in bullet direction
          const kbStrength = 4;
          e.x += (b.vx / GAME_ENGINE.BULLET_SPEED) * kbStrength * dtFactor;
          e.y += (b.vy / GAME_ENGINE.BULLET_SPEED) * kbStrength * dtFactor;

          if (b.isCrit || b.isSuperCrit) {
            s.critFlash = b.isSuperCrit ? 0.15 : 0.08;
            s.critFlashColor = b.isSuperCrit ? COLORS.SUPER_CRIT : COLORS.CRIT;
            audio.playCrit();
            EventBus.emit('critHit', {
              damage: b.damage,
              isSuperCrit: !!b.isSuperCrit,
              x: e.x,
              y: e.y,
            });
          }

          // Damage feedback
          p.getFloatingText(
            e.x + (Math.random() - 0.5) * 10,
            e.y - 20,
            b.damage.toFixed(0),
            b.isSuperCrit ? COLORS.CASINO_RED : b.isCrit ? COLORS.CASINO_GOLD : COLORS.SLOT_SILVER,
            b.isSuperCrit ? 36 : b.isCrit ? 28 : 20
          );

          if (e.health <= 0) {
            this.handleEnemyDeath(p, e, player, b.isSuperCrit);
          }
        }
      }
    });

    p.activeGems.forEach(g => {
      const dx = player.x - g.x;
      const dy = player.y - g.y;
      const distSq = dx * dx + dy * dy;
      const range = GAME_ENGINE.GEM_MAGNET_BASE_RANGE + player.magnet;
      const rangeSq = range * range;

      if (distSq < rangeSq) {
        const dist = Math.sqrt(distSq);
        const pull = lerp(12, 2, dist / range) * dtFactor;
        g.x += ((player.x - g.x) / dist) * pull;
        g.y += ((player.y - g.y) / dist) * pull;
      }

      const combinedRadius = player.radius + g.radius;
      if (distSq < combinedRadius * combinedRadius) {
        const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
        const xpGain = Math.floor(g.value * ComboSystem.getXpMultiplier());
        player.exp += xpGain;
        g.active = false;
        audio.playGem();

        // COLLECT EFFECT: Spiral/Circular burst of particles when gem is collected
        const collectCfg = ParticleConfigService.collect;
        const collectCount = Math.round(collectCfg.count * perfConfig.particleMultiplier);
        for (let i = 0; i < collectCount; i++) {
          const angle = (i / collectCount) * Math.PI * 2;
          const speed = collectCfg.speed * (0.6 + Math.random() * 0.4);
          const part = p.getParticle(
            g.x,
            g.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            g.color
          );
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- part can be undefined in tests
          if (part) {
            part.life = collectCfg.life;
            part.radius = collectCfg.radius;
          }
        }

        EventBus.emit('gemCollected', {
          value: g.value,
          isRare: g.isRare ?? false,
        });

        // prevent multiple levelUpStart emissions if multiple gems collected in 1 frame
        if (player.exp >= player.nextLevelExp && s.levelUpFreeze <= 0) {
          s.levelUpFreeze = 500;
          s.shake = 10;
          EventBus.emit('levelUpStart', {});
        }
      }
    });

    // 4. Player vs Buff Gem Collisions
    const buffGems = BuffGemSpawner.getActiveGems();
    for (const gem of buffGems) {
      if (!gem.active) continue;

      const dx = player.x - gem.x;
      const dy = player.y - gem.y;
      const distSq = dx * dx + dy * dy;

      // Magnet effect for buff gems (weaker than regular gems)
      const magnetRange = (GAME_ENGINE.GEM_MAGNET_BASE_RANGE + player.magnet) * 0.6;
      if (distSq < magnetRange * magnetRange) {
        const dist = Math.sqrt(distSq);
        const pull = lerp(8, 2, dist / magnetRange) * dtFactor;
        gem.x += (dx / dist) * pull;
        gem.y += (dy / dist) * pull;
      }

      // Collection check
      const combinedRadius = player.radius + gem.radius;
      if (distSq < combinedRadius * combinedRadius) {
        // Apply the buff
        BuffManager.addEffect(gem.decoratorClass);

        // Collect effects
        audio.playGem();
        s.shake = 5;

        // Particle burst with gem color
        const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
        const burstCount = Math.round(16 * perfConfig.particleMultiplier);
        for (let i = 0; i < burstCount; i++) {
          const angle = (i / burstCount) * Math.PI * 2;
          const speed = 4 + Math.random() * 2;
          const part = p.getParticle(
            gem.x,
            gem.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            gem.color
          );
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- part can be undefined in tests
          if (part) {
            part.life = 0.8;
            part.radius = 4;
          }
        }

        // Floating text with buff icon
        p.getFloatingText(gem.x, gem.y - 20, gem.icon, gem.color, 32);

        // Mark as collected
        BuffGemSpawner.collectGem(gem);
      }
    }
  }

  private static handleEnemyDeath(p: PoolManager, e: Enemy, player: Player, isSuperCrit?: boolean) {
    e.active = false;
    DifficultyManager.recordKill();
    EventBus.emit('enemyKilled', {
      x: e.x,
      y: e.y,
      type: e.type,
      isCrit: !!isSuperCrit,
    });

    // Spawn particles (scaled by performance config)
    const config = DeviceBenchmarkService.getPerformanceConfig();
    const baseParticleCount = isSuperCrit ? 30 : 10;
    const particleCount = Math.round(baseParticleCount * config.particleMultiplier);
    for (let k = 0; k < particleCount; k++) {
      p.getParticle(e.x, e.y, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, e.color);
    }

    // Spawn gem
    const isRare = Math.random() < 0.05 + player.luck * 0.05;
    p.getGem(
      e.x,
      e.y,
      (e.type === 'whale' ? 100 : 15) * (isRare ? 3 : 1),
      isRare ? 10 : 7,
      isRare ? COLORS.RARE_GEM : COLORS.GEM,
      isRare
    );
  }
  // lerp imported from utils/math.ts
}
