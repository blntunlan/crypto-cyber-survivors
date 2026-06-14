import {
  type Bullet,
  type Gem,
  type Particle,
  type FloatingText,
  type MarketPosition,
  type SpeedLine,
  type ImpactRing,
  type Interactable,
  type CryptoPair,
  type EnemyIntent,
} from '../../types';
import { type GameEnemy } from '../../factories/EnemyFactory';
import { type WhaleTier, type RSIEnemyModifier } from '../../types/indicators';
import { type EnemyId } from '../../config/EnemyRegistry';

/**
 * Interface for the Pool Manager.
 * Manages object pools for various game entities.
 */
export interface IPoolManager {
  readonly activeEnemies: GameEnemy[];
  readonly activeBullets: Bullet[];
  readonly activeGems: Gem[];
  readonly activeParticles: Particle[];
  readonly activeFloatingTexts: FloatingText[];
  readonly activeSpeedLines: SpeedLine[];
  readonly activeImpactRings: ImpactRing[];
  readonly activeInteractables: Interactable[];

  preWarm(config?: {
    enemies?: number;
    bullets?: number;
    particles?: number;
    gems?: number;
    texts?: number;
  }): void;

  getEnemy(
    x: number,
    y: number,
    difficulty: number,
    position: MarketPosition,
    enemyType?: EnemyId,
    pair?: CryptoPair,
    damageMultiplier?: number,
    speedMultiplier?: number,
    rsiModifier?: RSIEnemyModifier,
    hpMultiplier?: number,
    intent?: EnemyIntent,
    powerTier?: number
  ): GameEnemy;

  getWhaleEnemy(
    x: number,
    y: number,
    difficulty: number,
    position: MarketPosition,
    tier: WhaleTier,
    damageMultiplier?: number,
    speedMultiplier?: number,
    rsiModifier?: RSIEnemyModifier,
    hpMultiplier?: number,
    intent?: EnemyIntent,
    powerTier?: number
  ): GameEnemy;

  getBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    radius: number,
    color: string,
    isCrit: boolean,
    isSuperCrit: boolean
  ): Bullet;

  getGem(
    x: number,
    y: number,
    value: number,
    radius: number,
    color: string,
    isRare: boolean
  ): Gem;

  getParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    isPixel?: boolean
  ): Particle;

  getFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
    size: number,
    isCrit?: boolean,
    vx?: number,
    vy?: number
  ): FloatingText;

  getSpeedLine(
    x: number,
    y: number,
    length: number,
    width: number,
    angle: number,
    opacity: number
  ): SpeedLine;

  getImpactRing(
    x: number,
    y: number,
    startRadius: number,
    maxRadius: number,
    color: string,
    lineWidth: number
  ): ImpactRing;

  getInteractable(
    type: 'MINING_RIG' | 'LOOT_CRATE' | 'GAS_STATION',
    x: number,
    y: number,
    health: number
  ): Interactable;

  cleanup(): void;
  clearAll(): void;
  trimFreeLists(maxPoolSize?: number): void;

  // O(1) individual release methods
  releaseEnemy(enemy: GameEnemy): void;
  releaseBullet(bullet: Bullet): void;
  releaseGem(gem: Gem): void;
  releaseParticle(particle: Particle): void;
  releaseFloatingText(text: FloatingText): void;
  releaseSpeedLine(line: SpeedLine): void;
  releaseImpactRing(ring: ImpactRing): void;
  releaseInteractable(interactable: Interactable): void;
}
