import {
  type Bullet,
  type Gem,
  type Particle,
  type FloatingText,
  type MarketPosition,
  type SpeedLine,
  type Interactable,
} from '../../types';
import { type GameEnemy } from '../../factories/EnemyFactory';
import { type WhaleTier } from '../../types/indicators';
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
    enemyType?: EnemyId
  ): GameEnemy;

  getWhaleEnemy(
    x: number,
    y: number,
    difficulty: number,
    position: MarketPosition,
    tier: WhaleTier
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
    size: number
  ): FloatingText;

  getSpeedLine(
    x: number,
    y: number,
    length: number,
    width: number,
    angle: number,
    opacity: number
  ): SpeedLine;

  getInteractable(
    type: 'MINING_RIG' | 'LOOT_CRATE' | 'GAS_STATION',
    x: number,
    y: number,
    health: number
  ): Interactable;

  cleanup(): void;
  clearAll(): void;
  trimFreeLists(maxPoolSize?: number): void;
}
