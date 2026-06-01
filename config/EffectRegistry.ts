import { type GameEvent } from '../types/events';

export type EffectChannel = 'vfx' | 'sfx' | 'haptics';
export type EffectPriority = 'core' | 'market' | 'ceremony' | 'flavor';

export type EffectPolicy = {
  event: GameEvent;
  priority: EffectPriority;
  channels: readonly EffectChannel[];
  cooldownMs: number;
  reducedMotionScale: number;
};

export const EFFECT_POLICIES: readonly EffectPolicy[] = [
  {
    event: 'playerHit',
    priority: 'core',
    channels: ['vfx', 'sfx'],
    cooldownMs: 120,
    reducedMotionScale: 0.35,
  },
  {
    event: 'critHit',
    priority: 'core',
    channels: ['vfx', 'sfx'],
    cooldownMs: 80,
    reducedMotionScale: 0.45,
  },
  {
    event: 'enemyKilled',
    priority: 'core',
    channels: ['vfx'],
    cooldownMs: 0,
    reducedMotionScale: 0.5,
  },
  {
    event: 'gemCollected',
    priority: 'core',
    channels: ['vfx', 'sfx'],
    cooldownMs: 30,
    reducedMotionScale: 0.7,
  },
  {
    event: 'weaponFired',
    priority: 'core',
    channels: ['vfx', 'sfx'],
    cooldownMs: 50,
    reducedMotionScale: 0.65,
  },
  {
    event: 'nearMiss',
    priority: 'core',
    channels: ['vfx', 'sfx'],
    cooldownMs: 800,
    reducedMotionScale: 0.25,
  },
  {
    event: 'volatilityShock',
    priority: 'market',
    channels: ['vfx'],
    cooldownMs: 1000,
    reducedMotionScale: 0.2,
  },
  {
    event: 'priceMomentumUpdate',
    priority: 'market',
    channels: ['vfx', 'sfx'],
    cooldownMs: 1000,
    reducedMotionScale: 0.35,
  },
  {
    event: 'portalOpened',
    priority: 'ceremony',
    channels: ['vfx', 'sfx'],
    cooldownMs: 500,
    reducedMotionScale: 0.45,
  },
  {
    event: 'portalExtraction',
    priority: 'ceremony',
    channels: ['vfx', 'sfx'],
    cooldownMs: 500,
    reducedMotionScale: 0.45,
  },
];

const EFFECT_POLICY_MAP = new Map<GameEvent, EffectPolicy>(
  EFFECT_POLICIES.map(policy => [policy.event, policy])
);

export function getEffectPolicy(event: GameEvent): EffectPolicy | undefined {
  return EFFECT_POLICY_MAP.get(event);
}
