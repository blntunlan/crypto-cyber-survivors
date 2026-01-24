/**
 * BuffGem Types - Collectible buff items in the game world
 *
 * BuffGems spawn based on market volume changes and provide
 * temporary buffs when collected. They despawn after 5 seconds
 * if not collected.
 */

import { type DecoratorConstructor } from '../services/patterns/decorators/BaseDecorator';

export type BuffGemType =
  | 'rage'
  | 'diamond'
  | 'berserk'
  | 'lucky'
  | 'slow'
  | 'vulnerable';

export interface BuffGem {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  color: string;
  icon: string;
  buffType: BuffGemType;
  decoratorClass: DecoratorConstructor;
  spawnTime: number; // Timestamp when spawned (for sorting/debug)
  elapsedLifetime: number; // Time active in ms (pausable)
  lifetime: number; // Max lifetime in ms
  pulsePhase: number; // Animation phase
  vx?: number;
  vy?: number;
  velocityInitiated?: boolean;
}

// BuffGem configurations
export interface BuffGemConfig {
  type: BuffGemType;
  color: string;
  icon: string;
  isDebuff: boolean;
  rarity: number; // 0-1, higher = rarer
}

export const BUFF_GEM_CONFIGS: Record<BuffGemType, BuffGemConfig> = {
  rage: {
    type: 'rage',
    color: '#FF6B00',
    icon: '🔥',
    isDebuff: false,
    rarity: 0.25,
  },
  diamond: {
    type: 'diamond',
    color: '#00D4FF',
    icon: '💎',
    isDebuff: false,
    rarity: 0.15,
  },
  berserk: {
    type: 'berserk',
    color: '#FFD700',
    icon: '⚡',
    isDebuff: false,
    rarity: 0.2,
  },
  lucky: {
    type: 'lucky',
    color: '#00FF88',
    icon: '🍀',
    isDebuff: false,
    rarity: 0.25,
  },
  slow: {
    type: 'slow',
    color: '#8B4513',
    icon: '🐌',
    isDebuff: true,
    rarity: 0.1,
  },
  vulnerable: {
    type: 'vulnerable',
    color: '#8B0000',
    icon: '💀',
    isDebuff: true,
    rarity: 0.05,
  },
};
