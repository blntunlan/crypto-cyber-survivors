import { type IPoolManager } from '../../interfaces/IPoolManager';
import {
  type Player,
  type GameState,
  type Enemy,
  type Bullet,
  type Interactable,
} from '../../../types';
import { type IPhysicsContext } from './PhysicsTypes';
import { getPhysicsContext, physicsColors } from './PhysicsContext';
import { EventBus } from '../../core/EventBus';
import { CombatResolutionService } from './CombatResolutionService';
import { StatService } from '../../gameplay/StatService';
import { ThemeService } from '../../system/ThemeService';
import { type ICollisionSystem } from '../../interfaces/IPhysicsSubsystems';
import { GAME_ENGINE } from '../../../constants';
import { LeverageEngine } from '../../gameplay/LeverageEngine';

/**
 * CollisionSystem - Physical Interaction Orchestrator
 *
 * Responsibilities:
 * 1. Screen boundaries vs Enemies
 * 2. Player vs Enemy contact (damage, dodge, armor)
 * 3. Bullet vs Enemy impact (spatial grid lookup, damage, knockback)
 * 4. Per-hit damage feedback (floating text shown on every hit)
 * 5. Impact visual/audio feedback (particles, screenshake, sounds)
 */
export class CollisionSystem implements ICollisionSystem {
  private ctx: IPhysicsContext;
  private static instance: CollisionSystem | null = null;
  private nearbyPool: IPoolManager | null = null;
  private nearbyEnemy: Enemy | null = null;
  private nearbyInteractable: Interactable | null = null;
  private nearbyPlayer: Player | null = null;
  private nearbyState: GameState | null = null;
  private nearbyDtFactor: number = 1;
  private nearbyParticleMultiplier: number = 1;

  public static getInstance(): CollisionSystem {
    return (CollisionSystem.instance ??= new CollisionSystem());
  }

  constructor(context: IPhysicsContext = getPhysicsContext()) {
    this.ctx = context;
  }

  /**
   * Set a custom context (useful for testing/dependency injection)
   */
  public setContext(context: IPhysicsContext): void {
    this.ctx = context;
  }

  /**
   * Reset to default singleton context
   */
  public resetContext(): void {
    this.ctx = getPhysicsContext();
  }

  /**
   * Primary update loop for enemy-related collisions.
   *
   * @param pool - Access to game entity pools
   * @param player - Current player state
   * @param state - Global game engine state
   * @param dtFactor - Frame-level time scaling factor
   * @param width - Active canvas width
   * @param height - Active canvas height
   * @param onGameOver - Callback triggered on player death
   */
  public update(
    pool: IPoolManager,
    player: Player,
    state: GameState,
    dtFactor: number,
    width: number,
    height: number,
    onGameOver: () => void
  ): void {
    const perfConfig = this.ctx.performance.getPerformanceConfig();

    // Decrement Player I-Frames
    if (player.invulnerabilityTimer > 0) {
      player.invulnerabilityTimer = Math.max(
        0,
        player.invulnerabilityTimer - GAME_ENGINE.MS_PER_FRAME * dtFactor
      );
    }

    // Capture vulnerability state at frame start.
    // This allows ALL colliding enemies to deal damage in the same frame.
    // I-frames are applied AFTER the loop to prevent next-frame damage.
    const isVulnerable =
      !this.ctx.cheat.isGodMode() &&
      !state.isDashing &&
      player.invulnerabilityTimer <= 0;
    let frameDamageDealt = false;
    let frameDodged = false;

    const activeEnemies = pool.activeEnemies;
    const enemiesCount = activeEnemies.length;
    for (let i = 0; i < enemiesCount; i++) {
      const enemy = activeEnemies[i];
      if (!enemy) continue;

      // Skip dead/vanishing enemies
      if (enemy.isDying) {
        continue;
      }

      // Decrement Hit Flash Timer (Controls visual red/white flash)
      if (enemy.hitFlashTimer && enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - 1 * dtFactor);
      }
      if (enemy.hitImpactTimer && enemy.hitImpactTimer > 0) {
        enemy.hitImpactTimer = Math.max(
          0,
          enemy.hitImpactTimer - GAME_ENGINE.ENEMY_HIT_IMPACT_DECAY * dtFactor
        );
      }

      // 1. Boundary Check (Culling)
      if (this.isOffScreen(enemy, width, height)) {
        enemy.active = false;
        continue;
      }

      // 2. Track Screen Entry for Spawn Animations
      if (!enemy.hasEnteredScreen) {
        const onScreen =
          enemy.x > -enemy.radius &&
          enemy.x < width + enemy.radius &&
          enemy.y > -enemy.radius &&
          enemy.y < height + enemy.radius;

        if (onScreen) {
          enemy.hasEnteredScreen = true;
          enemy.spawnTimer = GAME_ENGINE.SPAWN_ANIMATION_INITIAL;
        }
      } else if (enemy.spawnTimer !== undefined && enemy.spawnTimer > 0) {
        enemy.spawnTimer -= GAME_ENGINE.COLLISION_SPAWN_TIMER_DEC * dtFactor;
      }

      // 4. Legacy Damage Buffer Decay (for pre-existing buffered values)
      if (enemy.damageBufferTimer !== undefined && enemy.damageBufferTimer > 0) {
        enemy.damageBufferTimer -= 0.05 * dtFactor;
        if (enemy.damageBufferTimer <= 0) {
          this.flushDamageBuffer(pool, enemy);
        }
      }

      // 5. Interaction Checks
      // Only check player-enemy collision if player is vulnerable and alive
      let hitResult: 'none' | 'hit' | 'dodge' = 'none';
      if (isVulnerable && player.hp > 0) {
        hitResult = this.checkPlayerEnemyCollision(
          pool,
          player,
          enemy,
          state,
          dtFactor,
          onGameOver
        );
        if (hitResult === 'hit') frameDamageDealt = true;
        else if (hitResult === 'dodge') frameDodged = true;
      }
      if (hitResult === 'none' && player.hp > 0) {
        this.checkNearMiss(pool, player, enemy);
      }
      this.processBulletCollisions(
        pool,
        enemy,
        player,
        state,
        dtFactor,
        perfConfig.particleMultiplier
      );
    }

    // Apply I-frames AFTER all enemy collisions are processed.
    // This ensures multiple enemies can damage the player in one frame,
    // but the player is protected for subsequent frames.
    if (frameDamageDealt) {
      player.invulnerabilityTimer = GAME_ENGINE.PLAYER_I_FRAME_DURATION;
    } else if (frameDodged) {
      player.invulnerabilityTimer = GAME_ENGINE.PLAYER_I_FRAME_DURATION / 2;
    }

    // 6. Interactables (Mining Rigs / Loot Crates) - Optimized loop
    const interactables = pool.activeInteractables;
    const interactablesLen = interactables.length;

    if (interactablesLen > 0) {
      const bullets = pool.activeBullets;
      // Early exit if no bullets active
      if (bullets.length === 0) {
        // Only update hit timers
        for (let i = 0; i < interactablesLen; i++) {
          const obj = interactables[i];
          if (!obj) continue;
          if (obj.hitTimer && obj.hitTimer > 0) {
            obj.hitTimer -= 0.05 * dtFactor;
            if (obj.hitTimer <= 0) obj.isHit = false;
          }
        }
        return;
      }

      for (let i = 0; i < interactablesLen; i++) {
        const obj = interactables[i];
        if (!obj?.active) continue;

        // Update hit timer
        const hitTimer = obj.hitTimer ?? 0;
        if (hitTimer > 0) {
          obj.hitTimer = hitTimer - 0.05 * dtFactor;
          if (obj.hitTimer <= 0) obj.isHit = false;
        }

        this.nearbyPool = pool;
        this.nearbyInteractable = obj;
        this.nearbyParticleMultiplier = perfConfig.particleMultiplier;
        try {
          this.ctx.bulletGrid.forEachNearbyWithContext(
            obj.x,
            obj.y,
            this,
            CollisionSystem.processInteractableBulletCandidate
          );
        } finally {
          this.clearNearbyContext();
        }
      }
    }
  }

  /**
   * Determines if an enemy is far enough outside the play area to be culled.
   */
  private isOffScreen(enemy: Enemy, width: number, height: number): boolean {
    const threshold = this.ctx.constants.ENEMY_OFFSCREEN_THRESHOLD;
    return (
      enemy.x < -threshold ||
      enemy.x > width + threshold ||
      enemy.y < -threshold ||
      enemy.y > height + threshold
    );
  }

  /**
   * Handles contact between Player and Enemy.
   * Calculates Dodge, Armor reduction, and HP depletion.
   * Returns 'hit', 'dodge', or 'none' for frame-level I-frame management.
   *
   * NOTE: Invulnerability/GodMode/Dash checks are handled by the caller (update loop).
   * I-frames are applied after ALL enemies are processed to allow multi-enemy hits per frame.
   */
  private checkPlayerEnemyCollision(
    pool: IPoolManager,
    player: Player,
    enemy: Enemy,
    state: GameState,
    dtFactor: number,
    onGameOver: () => void
  ): 'none' | 'hit' | 'dodge' {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distSq = dx * dx + dy * dy;
    const combinedRadiusSq =
      (GAME_ENGINE.PLAYER_HIT_BOX_RADIUS + enemy.radius) *
      (GAME_ENGINE.PLAYER_HIT_BOX_RADIUS + enemy.radius);

    // Radius-based collision check using squared distance
    if (distSq >= combinedRadiusSq) {
      return 'none';
    }

    // A. Dodge Check (per-enemy roll — player may dodge some but not all)
    const rawDodge = this.ctx.stats.getDodge(player);
    const dodgeChance = Math.min(rawDodge, this.ctx.statCaps.MAX_DODGE);

    if (Math.random() < dodgeChance) {
      pool.getFloatingText(
        player.x,
        player.y - GAME_ENGINE.COLLISION_TEXT_OFFSET_Y,
        'DODGE!',
        physicsColors.BULLET,
        GAME_ENGINE.DODGE_INDICATOR_SIZE
      );
      return 'dodge';
    }

    // B. Armor & Damage Calculation
    const rawArmor = this.ctx.stats.getArmor(player);
    const effectiveArmor = Math.min(rawArmor, this.ctx.statCaps.MAX_ARMOR);

    // Diminishing returns formula for armor
    const armorReduction =
      effectiveArmor / (effectiveArmor + GAME_ENGINE.ARMOR_RESISTANCE_FACTOR);

    const baseDamage = enemy.damage;
    // Apply LeverageEngine's dynamic damage multiplier
    // Higher leverage + higher volatility = exponentially more damage taken
    const leverageDamageMult = LeverageEngine.getMultipliers().damageTaken;
    const finalDamage = Math.max(
      baseDamage * GAME_ENGINE.DAMAGE_MINIMUM_MULTIPLIER,
      baseDamage *
        GAME_ENGINE.DAMAGE_REDUCTION_BASE *
        (1 - armorReduction) *
        leverageDamageMult
    );

    // Apply HP loss (Fixed per hit, not scaled by dtFactor since we use I-Frames)
    player.hp -= finalDamage;
    player.hp = Math.max(0, player.hp);

    // Emit events for immediate UI/Director feedback
    EventBus.emit('playerHit', {
      damage: finalDamage,
      remainingHp: player.hp,
      sourceX: enemy.x,
      sourceY: enemy.y,
      enemyType: enemy.type,
    });

    EventBus.emit('playerHealthChange', {
      hpPercent: (player.hp / player.maxHp) * 100,
      hp: player.hp,
      maxHp: player.maxHp,
    });

    // NOTE: I-frames are set in update() after ALL enemy collisions are processed

    // Apply knockback to the enemy that hit the player (separates it from player)
    this.applyKnockback(enemy, { x: player.x, y: player.y }, dtFactor);

    // Visual Feedback (accumulate shake for multi-hit impact)
    state.shake = Math.max(state.shake, GAME_ENGINE.PLAYER_HIT_SHAKE);
    state.damageIndicators.push({
      sourceX: enemy.x,
      sourceY: enemy.y,
      timestamp: this.ctx.constants.getGameTime(),
    });

    // Audio Feedback (Randomized to avoid spam/phasing)
    if (Math.random() > GAME_ENGINE.HIT_SOUND_PROBABILITY) {
      this.ctx.audio.playHit();
    }

    // Game Over Check
    if (player.hp <= 0 && !state.isGameOverTriggered) {
      state.isGameOverTriggered = true;
      onGameOver();
    }

    return 'hit';
  }

  private checkNearMiss(pool: IPoolManager, player: Player, enemy: Enemy): void {
    if (!enemy.active || enemy.isDying || !enemy.hasEnteredScreen) {
      return;
    }
    if (enemy.hasTriggeredNearMiss) {
      return;
    }

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distSq = dx * dx + dy * dy;
    const collisionRadius = GAME_ENGINE.PLAYER_HIT_BOX_RADIUS + enemy.radius;
    const collisionRadiusSq = collisionRadius * collisionRadius;

    if (distSq <= collisionRadiusSq) {
      return;
    }

    const nearMissRadius = collisionRadius + this.ctx.constants.NEAR_MISS_THRESHOLD;
    if (distSq > nearMissRadius * nearMissRadius) {
      return;
    }

    enemy.hasTriggeredNearMiss = true;
    pool.getImpactRing(
      player.x,
      player.y,
      GAME_ENGINE.NEAR_MISS_RING_START_RADIUS,
      GAME_ENGINE.NEAR_MISS_RING_RADIUS,
      physicsColors.BULLET,
      GAME_ENGINE.NEAR_MISS_RING_LINE_WIDTH
    );
    EventBus.emit('nearMiss', {
      enemyType: enemy.type,
      distance: Math.max(0, Math.sqrt(distSq) - collisionRadius),
      bonusXp: 0,
    });
  }

  /**
   * Spatial grid assisted collision check for bullets near a specific enemy.
   * Optimized to reduce iterator overhead and use squared distance comparisons.
   */
  private processBulletCollisions(
    pool: IPoolManager,
    enemy: Enemy,
    player: Player,
    state: GameState,
    dtFactor: number,
    particleMultiplier: number
  ): void {
    const ex = enemy.x;
    const ey = enemy.y;

    this.nearbyPool = pool;
    this.nearbyEnemy = enemy;
    this.nearbyPlayer = player;
    this.nearbyState = state;
    this.nearbyDtFactor = dtFactor;
    this.nearbyParticleMultiplier = particleMultiplier;

    try {
      this.ctx.bulletGrid.forEachNearbyWithContext(
        ex,
        ey,
        this,
        CollisionSystem.processEnemyBulletCandidate
      );
    } finally {
      this.clearNearbyContext();
    }
  }

  private clearNearbyContext(): void {
    this.nearbyPool = null;
    this.nearbyEnemy = null;
    this.nearbyInteractable = null;
    this.nearbyPlayer = null;
    this.nearbyState = null;
    this.nearbyDtFactor = 1;
    this.nearbyParticleMultiplier = 1;
  }

  private static processEnemyBulletCandidate(
    bullet: Bullet,
    system: CollisionSystem
  ): void {
    const enemy = system.nearbyEnemy;
    const pool = system.nearbyPool;
    const player = system.nearbyPlayer;
    const state = system.nearbyState;
    if (
      !enemy?.active ||
      enemy.isDying ||
      !bullet.active ||
      !pool ||
      !player ||
      !state
    ) {
      return;
    }

    const dx = enemy.x - bullet.x;
    const dy = enemy.y - bullet.y;
    const distSq = dx * dx + dy * dy;
    const combinedRadius = enemy.radius + bullet.radius;

    if (distSq < combinedRadius * combinedRadius) {
      system.resolveBulletHit(
        pool,
        enemy,
        bullet,
        player,
        state,
        system.nearbyDtFactor,
        system.nearbyParticleMultiplier
      );
    }
  }

  private static processInteractableBulletCandidate(
    bullet: Bullet,
    system: CollisionSystem
  ): void {
    const obj = system.nearbyInteractable;
    const pool = system.nearbyPool;
    if (!obj?.active || !bullet.active || !pool) return;
    if (obj.type === 'LOOT_CRATE') return;

    const dx = obj.x - bullet.x;
    const dy = obj.y - bullet.y;
    const distSq = dx * dx + dy * dy;
    const combinedRadius = obj.radius + bullet.radius;

    if (distSq >= combinedRadius * combinedRadius) return;

    system.primeWeaponStateOnHit(bullet, pool);
    if (system.shouldSkipRepeatedHit(obj, bullet, 'interactable')) {
      return;
    }
    if (!system.shouldKeepBulletActiveAfterHit(bullet)) {
      bullet.active = false;
    }
    obj.health -= bullet.damage;
    obj.isHit = true;
    obj.hitTimer = 0.2;

    const count = Math.round(3 * system.nearbyParticleMultiplier);
    for (let p = 0; p < count; p++) {
      pool.getParticle(
        obj.x,
        obj.y,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        obj.color
      ).life = 0.5;
    }

    if (obj.health <= 0) {
      obj.active = false;
      const rewardValue = obj.type === 'MINING_RIG' ? 50 : 100;
      const rewardColor = obj.type === 'MINING_RIG' ? '#FFD700' : '#A855F7';

      pool.getGem(obj.x, obj.y, rewardValue, 15, rewardColor, true);
      system.ctx.audio.playCrit();

      for (let ex = 0; ex < 15; ex++) {
        pool.getParticle(
          obj.x,
          obj.y,
          (Math.random() - 0.5) * 300,
          (Math.random() - 0.5) * 300,
          rewardColor
        ).life = 1.0;
      }
    }
  }

  /**
   * Applies damage, knockback, and triggers visual effects on bullet impact.
   */
  private resolveBulletHit(
    pool: IPoolManager,
    enemy: Enemy,
    bullet: Bullet,
    player: Player,
    state: GameState,
    dtFactor: number,
    particleMultiplier: number
  ): void {
    this.primeWeaponStateOnHit(bullet, pool);
    if (this.shouldSkipRepeatedHit(enemy, bullet, 'enemy')) {
      return;
    }

    // Apply Damage
    enemy.health -= bullet.damage;
    if (!this.shouldKeepBulletActiveAfterHit(bullet)) {
      bullet.active = false;
    }

    EventBus.emit('enemyDamaged', {
      damage: bullet.damage,
      remainingHp: Math.max(0, enemy.health),
      maxHp: enemy.maxHealth,
      x: enemy.x,
      y: enemy.y,
      enemyId: enemy.id,
      enemyType: enemy.type,
      isCrit: !!bullet.isCrit,
      isSuperCrit: !!bullet.isSuperCrit,
    });

    // Visual/Physics Feedback
    this.applyHitImpact(enemy, bullet);
    this.spawnImpactParticles(pool, bullet, particleMultiplier);
    this.applyKnockback(enemy, bullet, dtFactor);
    this.triggerCritEffects(bullet, state);
    this.bufferDamage(pool, enemy, bullet);

    // Hit Stop Effect (Only on Crits/Super Crits to maintain flow)
    if (bullet.isCrit || bullet.isSuperCrit) {
      // Add screen shake for impact
      state.shake = Math.max(
        state.shake,
        bullet.isSuperCrit
          ? GAME_ENGINE.PLAYER_HIT_SHAKE * 0.8
          : GAME_ENGINE.PLAYER_HIT_SHAKE * 0.4
      );

      EventBus.emit('hitStop', {
        duration: bullet.isSuperCrit
          ? this.ctx.constants.HIT_STOP_CRIT
          : this.ctx.constants.HIT_STOP_NORMAL, // "Normal" stop for standard crits
        isCrit: true,
        isSuperCrit: !!bullet.isSuperCrit,
      });
    }

    // Death Check
    if (enemy.health <= 0) {
      CombatResolutionService.handleEnemyDeath(
        pool,
        enemy,
        player,
        !!bullet.isSuperCrit
      );
    }
  }

  private primeWeaponStateOnHit(bullet: Bullet, pool: IPoolManager): void {
    if (bullet.weaponId !== 'aoe_nuke' || bullet.phase === 'shockwave') {
      return;
    }

    bullet.phase = 'shockwave';
    bullet.age = 0;
    bullet.vx = 0;
    bullet.vy = 0;
    bullet.shockwaveRadius = 5;
    bullet.radius = 5;
    bullet.hitSet?.clear();
    spawnNukeDetonationParticles(bullet.x, bullet.y, pool);
  }

  private shouldKeepBulletActiveAfterHit(bullet: Bullet): boolean {
    return (
      bullet.weaponId === 'boomerang' ||
      bullet.weaponId === 'laser' ||
      bullet.weaponId === 'aoe_nuke' ||
      bullet.weaponId === 'orbit_shield'
    );
  }

  private shouldSkipRepeatedHit(
    entity: { id?: string; poolIndex?: number; x: number; y: number },
    bullet: Bullet,
    namespace: string
  ): boolean {
    if (!this.shouldKeepBulletActiveAfterHit(bullet)) {
      return false;
    }

    let hitSet = bullet.hitSet;
    if (hitSet === undefined) {
      hitSet = new Set<string | number>();
      bullet.hitSet = hitSet;
    }

    const key = this.getRepeatedHitKey(entity, namespace);
    if (hitSet.has(key)) {
      return true;
    }

    hitSet.add(key);
    return false;
  }

  private getRepeatedHitKey(
    entity: { id?: string; poolIndex?: number; x: number; y: number },
    namespace: string
  ): number {
    const namespaceId = namespace === 'enemy' ? 1 : 2;
    const entityId =
      entity.poolIndex ??
      (entity.id !== undefined
        ? this.hashEntityId(entity.id)
        : ((Math.round(entity.x) & 0xffff) << 16) | (Math.round(entity.y) & 0xffff));
    return namespaceId * 0x100000000 + (entityId >>> 0);
  }

  private hashEntityId(id: string): number {
    let hash = 2166136261;
    for (let i = 0; i < id.length; i++) {
      hash ^= id.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /**
   * Pushes enemy away from the point of impact.
   */
  private applyKnockback(
    enemy: Enemy,
    source: { x: number; y: number },
    dtFactor: number
  ): void {
    const dx = enemy.x - source.x;
    const dy = enemy.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return; // Avoid division by zero if source and enemy are at the same spot

    const strength = GAME_ENGINE.KNOCKBACK_STRENGHT;
    // Normalize direction vector and apply force
    enemy.x += (dx / dist) * strength * dtFactor;
    enemy.y += (dy / dist) * strength * dtFactor;
  }

  private applyHitImpact(enemy: Enemy, bullet: Bullet): void {
    let dx = bullet.vx;
    let dy = bullet.vy;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) {
      dx = enemy.x - bullet.x;
      dy = enemy.y - bullet.y;
      dist = Math.sqrt(dx * dx + dy * dy);
    }

    if (dist === 0) {
      enemy.hitRecoilX = 0;
      enemy.hitRecoilY = 0;
    } else {
      const recoilDistance =
        GAME_ENGINE.ENEMY_HIT_RECOIL_DISTANCE *
        (bullet.isCrit || bullet.isSuperCrit
          ? GAME_ENGINE.ENEMY_HIT_RECOIL_CRIT_MULT
          : 1);
      enemy.hitRecoilX = (dx / dist) * recoilDistance;
      enemy.hitRecoilY = (dy / dist) * recoilDistance;
    }

    enemy.hitImpactTimer = 1;
  }

  /**
   * Handles flash and audio for critical hits.
   */
  private triggerCritEffects(bullet: Bullet, state: GameState): void {
    if (bullet.isCrit || bullet.isSuperCrit) {
      state.critFlash = bullet.isSuperCrit ? 0.15 : 0.08;
      state.critFlashColor = bullet.isSuperCrit
        ? physicsColors.SUPER_CRIT
        : physicsColors.CRIT;
      // Audio/event feedback is handled per-hit in bufferDamage().
    }
  }

  /**
   * Shows damage feedback immediately on each hit.
   */
  private bufferDamage(pool: IPoolManager, enemy: Enemy, bullet: Bullet): void {
    const isSuperCrit = !!bullet.isSuperCrit;
    const isCrit = !!bullet.isCrit;

    const color = isSuperCrit
      ? physicsColors.CASINO_RED
      : isCrit
        ? physicsColors.CASINO_GOLD
        : physicsColors.SLOT_SILVER;

    const size = isSuperCrit
      ? GAME_ENGINE.DAMAGE_TEXT_SIZE_SUPER_CRIT
      : isCrit
        ? GAME_ENGINE.DAMAGE_TEXT_SIZE_CRIT
        : GAME_ENGINE.DAMAGE_TEXT_SIZE_NORMAL;

    const text = StatService.formatCompact(bullet.damage);
    if (text) {
      pool.getFloatingText(
        enemy.x + (Math.random() - 0.5) * GAME_ENGINE.DAMAGE_STACK_THRESHOLD_RANDOM,
        enemy.y - GAME_ENGINE.COLLISION_TEXT_OFFSET_Y,
        text,
        color,
        size
      );
    }

    // Trigger hit flash immediately on each hit for visual feedback
    enemy.hitFlashTimer = 8;

    // Clear legacy buffer fields to fully disable stacked feedback mode.
    enemy.damageBuffer = 0;
    enemy.damageBufferTimer = 0;
    enemy.damageBufferIsCrit = false;
    enemy.damageBufferIsSuperCrit = false;
    enemy.damageBufferCritCount = 0;

    if (isCrit || isSuperCrit) {
      this.ctx.audio.playCrit();
      EventBus.emit('critHit', {
        damage: bullet.damage,
        isSuperCrit,
        x: enemy.x,
        y: enemy.y,
        count: 1,
      });
    }
  }

  /**
   * Converts accumulated damage into a single on-screen floating text.
   */
  private flushDamageBuffer(pool: IPoolManager, enemy: Enemy): void {
    if (!enemy.damageBuffer || enemy.damageBuffer <= 0) {
      return;
    }

    const isSuperCrit = !!enemy.damageBufferIsSuperCrit;
    const isCrit = !!enemy.damageBufferIsCrit;

    // Pick color based on highest hit tier
    const color = isSuperCrit
      ? physicsColors.CASINO_RED
      : isCrit
        ? physicsColors.CASINO_GOLD
        : physicsColors.SLOT_SILVER;

    const size = isSuperCrit
      ? GAME_ENGINE.DAMAGE_TEXT_SIZE_SUPER_CRIT
      : isCrit
        ? GAME_ENGINE.DAMAGE_TEXT_SIZE_CRIT
        : GAME_ENGINE.DAMAGE_TEXT_SIZE_NORMAL;

    // Dynamic scale based on stack intensity
    const maxH = enemy.maxHealth || 100;
    const stackWeight = Math.min(0.5, enemy.damageBuffer / (maxH * 0.5));
    const finalSize = size * (1 + stackWeight);

    const text = StatService.formatCompact(enemy.damageBuffer);

    if (text) {
      pool.getFloatingText(
        enemy.x + (Math.random() - 0.5) * GAME_ENGINE.DAMAGE_STACK_THRESHOLD_RANDOM,
        enemy.y - GAME_ENGINE.COLLISION_TEXT_OFFSET_Y,
        text,
        color,
        finalSize
      );
    }

    // Play Feedback (Audio/Events) - Optimized (Once per stack)
    if (isCrit || isSuperCrit) {
      this.ctx.audio.playCrit();
      EventBus.emit('critHit', {
        damage: enemy.damageBuffer,
        isSuperCrit: isSuperCrit,
        x: enemy.x,
        y: enemy.y,
        count: enemy.damageBufferCritCount ?? 1,
      });
    }

    // Reset buffer
    enemy.damageBuffer = 0;
    enemy.damageBufferTimer = 0;
    enemy.hitFlashTimer = 20; // 20 frames of "white" flash time (approx 330ms)
    enemy.damageBufferIsCrit = false;
    enemy.damageBufferIsSuperCrit = false;
    enemy.damageBufferCritCount = 0;
  }

  /**
   * Spawns cosmetic particles at the impact site.
   */
  private spawnImpactParticles(
    pool: IPoolManager,
    bullet: Bullet,
    particleMultiplier: number
  ): void {
    const impactCfg = this.ctx.particles.impact;
    const count = Math.round(impactCfg.count * particleMultiplier);
    const isRetro = ThemeService.isRetro();

    for (let i = 0; i < count; i++) {
      pool.getParticle(
        bullet.x,
        bullet.y,
        (Math.random() - 0.5) * impactCfg.speed,
        (Math.random() - 0.5) * impactCfg.speed,
        bullet.isSuperCrit ? physicsColors.SUPER_CRIT : bullet.color,
        isRetro
      ).life = impactCfg.life;
    }
  }
}

/**
 * Spawns orange/yellow debris particles and dark smoke particles on Nuke detonation.
 */
function spawnNukeDetonationParticles(x: number, y: number, pool: IPoolManager): void {
  // Debris particles (orange/yellow)
  for (let i = 0; i < 26; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const color = Math.random() < 0.5 ? '#ff8833' : '#ffcc44';
    const p = pool.getParticle(x, y, vx, vy, color);
    p.life = 0.6 + Math.random() * 0.4;
  }
  // Smoke particles (dark brown, slowly rising)
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 1.0; // drift upwards
    const p = pool.getParticle(x, y, vx, vy, '#3e2723'); // Dark brown smoke
    p.life = 0.8 + Math.random() * 0.4;
  }
}
