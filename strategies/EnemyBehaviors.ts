/**
 * EnemyBehaviors - Strategy Pattern Implementation
 *
 * Defines different movement strategies for enemies.
 * Each strategy encapsulates a specific movement algorithm.
 */

import { type Enemy } from '../types';

/**
 * Movement Strategy Interface
 */
export interface MovementStrategy {
  /**
   * Update enemy position based on strategy
   * @param enemy - The enemy to move
   * @param playerX - Player X position
   * @param playerY - Player Y position
   * @param dtFactor - Delta time factor for frame-rate independence (1.0 = 60fps)
   */
  move(enemy: Enemy, playerX: number, playerY: number, dtFactor: number): void;

  /**
   * Get strategy name for debugging
   */
  readonly name: string;
}

/**
 * ChaseStrategy - Direct pursuit of the player
 * Most basic and common enemy behavior
 */
export class ChaseStrategy implements MovementStrategy {
  readonly name = 'chase';

  move(enemy: Enemy, playerX: number, playerY: number, dtFactor: number): void {
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      enemy.x += (dx / dist) * enemy.speed * dtFactor;
      enemy.y += (dy / dist) * enemy.speed * dtFactor;
    }
  }
}

/**
 * StraightStrategy - Direct, slow approach with no evasion
 *
 * Used for "friendly" enemies when RSI favors the player.
 * These enemies are easy to hit (~95% accuracy) due to:
 * - No zigzag or erratic movement
 * - Slower speed (0.7x multiplier)
 * - Predictable, straight-line path
 *
 * Psychological: Represents favorable market conditions
 */
export class StraightStrategy implements MovementStrategy {
  readonly name = 'straight';
  private speedMultiplier: number;

  constructor(speedMultiplier: number = 0.7) {
    this.speedMultiplier = speedMultiplier;
  }

  move(enemy: Enemy, playerX: number, playerY: number, dtFactor: number): void {
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      // Simple, direct, slow approach - easy target
      enemy.x += (dx / dist) * enemy.speed * this.speedMultiplier * dtFactor;
      enemy.y += (dy / dist) * enemy.speed * this.speedMultiplier * dtFactor;
    }
  }
}

/**
 * ZigZagStrategy - Side-to-side movement while approaching
 * Makes enemies harder to hit
 */
export class ZigZagStrategy implements MovementStrategy {
  readonly name = 'zigzag';
  private phase: number = 0;
  private amplitude: number = 3;
  private frequency: number = 0.1;

  constructor(amplitude: number = 3, frequency: number = 0.1) {
    this.amplitude = amplitude;
    this.frequency = frequency;
    this.phase = Math.random() * Math.PI * 2; // Random start phase
  }

  move(enemy: Enemy, playerX: number, playerY: number, dtFactor: number): void {
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      // Calculate perpendicular direction for zigzag
      const perpX = -dy / dist;
      const perpY = dx / dist;

      // Zigzag offset (phase also scaled by dtFactor)
      this.phase += this.frequency * dtFactor;
      const offset = Math.sin(this.phase) * this.amplitude;

      // Move towards player with zigzag
      enemy.x += ((dx / dist) * enemy.speed + perpX * offset) * dtFactor;
      enemy.y += ((dy / dist) * enemy.speed + perpY * offset) * dtFactor;
    }
  }
}

/**
 * CircleStrategy - Circles around the player before approaching
 * Used for "flanking" enemies
 */
export class CircleStrategy implements MovementStrategy {
  readonly name = 'circle';
  private angle: number = 0;
  private circleSpeed: number = 0.02;
  private approachThreshold: number = 200;

  constructor(circleSpeed: number = 0.02) {
    this.circleSpeed = circleSpeed;
    this.angle = Math.random() * Math.PI * 2;
  }

  move(enemy: Enemy, playerX: number, playerY: number, dtFactor: number): void {
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.approachThreshold) {
      // Circle around at distance
      this.angle += this.circleSpeed * dtFactor;
      const targetX = playerX + Math.cos(this.angle) * this.approachThreshold;
      const targetY = playerY + Math.sin(this.angle) * this.approachThreshold;

      const tdx = targetX - enemy.x;
      const tdy = targetY - enemy.y;
      const tDist = Math.hypot(tdx, tdy);

      if (tDist > 0) {
        enemy.x += (tdx / tDist) * enemy.speed * dtFactor;
        enemy.y += (tdy / tDist) * enemy.speed * dtFactor;
      }
    } else {
      // Close enough, approach directly
      if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed * dtFactor;
        enemy.y += (dy / dist) * enemy.speed * dtFactor;
      }
    }
  }
}

/**
 * SlowApproachStrategy - Slow, menacing approach
 * Used for "whale" type enemies
 */
export class SlowApproachStrategy implements MovementStrategy {
  readonly name = 'slowApproach';
  private speedMultiplier: number;

  constructor(speedMultiplier: number = 0.5) {
    this.speedMultiplier = speedMultiplier;
  }

  move(enemy: Enemy, playerX: number, playerY: number, dtFactor: number): void {
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      enemy.x += (dx / dist) * enemy.speed * this.speedMultiplier * dtFactor;
      enemy.y += (dy / dist) * enemy.speed * this.speedMultiplier * dtFactor;
    }
  }
}

/**
 * ExplosiveStrategy - Rushes towards player, faster as it gets closer
 * Used for "liquidator" type enemies
 */
export class ExplosiveStrategy implements MovementStrategy {
  readonly name = 'explosive';
  private rushDistance: number = 150;

  move(enemy: Enemy, playerX: number, playerY: number, dtFactor: number): void {
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      // Speed up as it gets closer to player
      const speedBoost = dist < this.rushDistance ? 1.5 : 1.0;
      enemy.x += (dx / dist) * enemy.speed * speedBoost * dtFactor;
      enemy.y += (dy / dist) * enemy.speed * speedBoost * dtFactor;
    }
  }
}

/**
 * GrowingStrategy - Grows in size while approaching, creating visual pressure
 * Used for "pumpdump" type enemies
 */
export class GrowingStrategy implements MovementStrategy {
  readonly name = 'growing';
  private growthRate: number = 0.02;
  private maxGrowth: number = 2.0;
  private currentGrowth: number = 1.0;
  private wavePhase: number = 0;

  move(enemy: Enemy, playerX: number, playerY: number, dtFactor: number): void {
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dist = Math.hypot(dx, dy);

    // Grow over time (visual effect handled in GameEngine)
    if (this.currentGrowth < this.maxGrowth) {
      this.currentGrowth += this.growthRate * dtFactor;
    }

    // Move with slight wave pattern (frame-rate independent)
    if (dist > 0) {
      this.wavePhase += 0.05 * dtFactor; // ~0.003 * 16.67 ≈ 0.05 per frame
      const wave = Math.sin(this.wavePhase) * 0.3;
      enemy.x += (dx / dist) * enemy.speed * (1 + wave) * dtFactor;
      enemy.y += (dy / dist) * enemy.speed * (1 - wave) * dtFactor;
    }
  }
}

/**
 * TeleportStrategy - Chases then teleports unpredictably near the player
 * Used for "rugpull" type enemies — deceptive, hard to track
 */
export class TeleportStrategy implements MovementStrategy {
  readonly name = 'teleport';
  private teleportTimer: number = 0;
  private teleportInterval: number;
  private teleportRange: number;

  constructor(interval: number = 120, range: number = 150) {
    this.teleportInterval = interval;
    this.teleportRange = range;
  }

  move(enemy: Enemy, playerX: number, playerY: number, dtFactor: number): void {
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dist = Math.hypot(dx, dy);

    this.teleportTimer += dtFactor;

    if (this.teleportTimer >= this.teleportInterval && dist < 400) {
      // Teleport to a random position near the player
      const angle = Math.random() * Math.PI * 2;
      const teleportDist = 80 + Math.random() * this.teleportRange;
      enemy.x = playerX + Math.cos(angle) * teleportDist;
      enemy.y = playerY + Math.sin(angle) * teleportDist;
      this.teleportTimer = 0;
    } else if (dist > 0) {
      // Normal chase between teleports
      enemy.x += (dx / dist) * enemy.speed * dtFactor;
      enemy.y += (dy / dist) * enemy.speed * dtFactor;
    }
  }
}

/**
 * PredictiveStrategy - Leads the player by predicting movement direction
 * Used for "mev_bot" enemies — algorithmic front-runners
 */
export class PredictiveStrategy implements MovementStrategy {
  readonly name = 'predictive';
  private lastPlayerX: number = 0;
  private lastPlayerY: number = 0;
  private initialized: boolean = false;
  private leadFactor: number;

  constructor(leadFactor: number = 2.5) {
    this.leadFactor = leadFactor;
  }

  move(enemy: Enemy, playerX: number, playerY: number, dtFactor: number): void {
    if (!this.initialized) {
      this.lastPlayerX = playerX;
      this.lastPlayerY = playerY;
      this.initialized = true;
    }

    // Calculate player velocity
    const inverseDelta = dtFactor > 0 ? 1 / dtFactor : 0;
    const pvx = (playerX - this.lastPlayerX) * inverseDelta;
    const pvy = (playerY - this.lastPlayerY) * inverseDelta;

    // Predict future position
    const predictX = playerX + pvx * this.leadFactor;
    const predictY = playerY + pvy * this.leadFactor;

    const dx = predictX - enemy.x;
    const dy = predictY - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      enemy.x += (dx / dist) * enemy.speed * 1.2 * dtFactor;
      enemy.y += (dy / dist) * enemy.speed * 1.2 * dtFactor;
    }

    this.lastPlayerX = playerX;
    this.lastPlayerY = playerY;
  }
}

/**
 * BurstStrategy - Charges up while stationary, then bursts forward at high speed
 * Used for "flash_loan" enemies — instant devastating attacks
 */
export class BurstStrategy implements MovementStrategy {
  readonly name = 'burst';
  private chargeTimer: number = 0;
  private chargeDuration: number;
  private burstDuration: number;
  private burstTimer: number = 0;
  private isCharging: boolean = true;
  private burstDirX: number = 0;
  private burstDirY: number = 0;

  constructor(chargeDuration: number = 90, burstDuration: number = 20) {
    this.chargeDuration = chargeDuration;
    this.burstDuration = burstDuration;
  }

  move(enemy: Enemy, playerX: number, playerY: number, dtFactor: number): void {
    if (this.isCharging) {
      this.chargeTimer += dtFactor;

      // Slow approach during charge (menacing)
      const dx = playerX - enemy.x;
      const dy = playerY - enemy.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed * 0.2 * dtFactor;
        enemy.y += (dy / dist) * enemy.speed * 0.2 * dtFactor;
      }

      if (this.chargeTimer >= this.chargeDuration) {
        // Lock burst direction towards player
        if (dist > 0) {
          this.burstDirX = dx / dist;
          this.burstDirY = dy / dist;
        }
        this.isCharging = false;
        this.burstTimer = 0;
      }
    } else {
      // BURST phase — extremely fast dash
      this.burstTimer += dtFactor;
      enemy.x += this.burstDirX * enemy.speed * 3.5 * dtFactor;
      enemy.y += this.burstDirY * enemy.speed * 3.5 * dtFactor;

      if (this.burstTimer >= this.burstDuration) {
        this.isCharging = true;
        this.chargeTimer = 0;
      }
    }
  }
}

/**
 * PincerStrategy - Approaches from perpendicular offset for pincer maneuvers
 * Used for "sandwich" enemies — designed to spawn in pairs from opposite sides
 */
export class PincerStrategy implements MovementStrategy {
  readonly name = 'pincer';
  private offsetSign: number;
  private orbitPhase: number = 0;
  private convergeDist: number = 120;

  constructor(offsetSign: number = 1) {
    this.offsetSign = offsetSign;
    this.orbitPhase = Math.random() * Math.PI;
  }

  move(enemy: Enemy, playerX: number, playerY: number, dtFactor: number): void {
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.convergeDist) {
      // Approach from offset angle (perpendicular flanking)
      const perpX = -dy / dist;
      const perpY = dx / dist;
      const offset = this.offsetSign * 60;

      const targetX = playerX + perpX * offset;
      const targetY = playerY + perpY * offset;

      const tdx = targetX - enemy.x;
      const tdy = targetY - enemy.y;
      const tDist = Math.hypot(tdx, tdy);

      if (tDist > 0) {
        enemy.x += (tdx / tDist) * enemy.speed * dtFactor;
        enemy.y += (tdy / tDist) * enemy.speed * dtFactor;
      }
    } else {
      // Close enough — converge directly on player
      this.orbitPhase += 0.03 * dtFactor;
      if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed * 1.3 * dtFactor;
        enemy.y += (dy / dist) * enemy.speed * 1.3 * dtFactor;
      }
    }
  }
}

/**
 * AbsorbStrategy - Slow menacing approach with periodic growth pulses
 * Used for "51_attack" boss enemies — network dominance theme
 */
export class AbsorbStrategy implements MovementStrategy {
  readonly name = 'absorb';
  private pulseTimer: number = 0;
  private pulseCycle: number = 180; // frames between pulses
  private maxGrowthFactor: number = 1.8;
  private currentGrowth: number = 1.0;

  move(enemy: Enemy, playerX: number, playerY: number, dtFactor: number): void {
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dist = Math.hypot(dx, dy);

    // Slow, unstoppable approach
    if (dist > 0) {
      const speedMod = 0.4 + this.currentGrowth * 0.1;
      enemy.x += (dx / dist) * enemy.speed * speedMod * dtFactor;
      enemy.y += (dy / dist) * enemy.speed * speedMod * dtFactor;
    }

    // Periodic growth pulse (visual + hitbox expansion)
    this.pulseTimer += dtFactor;
    while (
      this.pulseTimer >= this.pulseCycle &&
      this.currentGrowth < this.maxGrowthFactor
    ) {
      this.currentGrowth = Math.min(this.maxGrowthFactor, this.currentGrowth + 0.1);
      enemy.radius = Math.round(enemy.radius * 1.05);
      enemy.damage = Math.round(enemy.damage * 1.08);
      this.pulseTimer -= this.pulseCycle;
    }
  }
}

/**
 * Strategy Factory - Creates strategies based on enemy type
 */
export function createMovementStrategy(type: string): MovementStrategy {
  switch (type) {
    case 'whale':
      return new SlowApproachStrategy(0.6);
    case 'fud':
      return new ZigZagStrategy(4, 0.15);
    case 'bull':
      return new CircleStrategy(0.03);
    case 'liquidator':
      return new ExplosiveStrategy();
    case 'pumpdump':
      return new GrowingStrategy();
    case 'rugpull':
      return new TeleportStrategy(100, 140);
    case 'mev_bot':
      return new PredictiveStrategy(2.5);
    case 'flash_loan':
      return new BurstStrategy(80, 18);
    case 'sandwich':
      return new PincerStrategy(Math.random() > 0.5 ? 1 : -1);
    case '51_attack':
      return new AbsorbStrategy();
    case 'bear':
    default:
      return new ChaseStrategy();
  }
}

/**
 * Creates movement strategy based on market indicator pattern
 *
 * Used by the MarketIndicatorService to apply RSI-based movement:
 * - 'straight': Friendly enemies (favorable RSI) - easy to hit
 * - 'zigzag': Aggressive enemies (unfavorable RSI) - hard to hit
 * - 'chase': Neutral enemies - default behavior
 *
 * @param pattern Movement pattern from RSIEnemyModifier
 * @returns Movement strategy instance
 */
export function createMarketMovementStrategy(
  pattern: 'straight' | 'zigzag' | 'chase' | 'circle'
): MovementStrategy {
  switch (pattern) {
    case 'straight':
      return new StraightStrategy(0.7);
    case 'zigzag':
      return new ZigZagStrategy(5, 0.2); // More aggressive zigzag
    case 'circle':
      return new CircleStrategy(0.03);
    case 'chase':
    default:
      return new ChaseStrategy();
  }
}
