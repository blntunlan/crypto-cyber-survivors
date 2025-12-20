/**
 * EnemyBehaviors - Strategy Pattern Implementation
 *
 * Defines different movement strategies for enemies.
 * Each strategy encapsulates a specific movement algorithm.
 */

import { Enemy } from '../types';

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
    case 'bear':
    default:
      return new ChaseStrategy();
  }
}
