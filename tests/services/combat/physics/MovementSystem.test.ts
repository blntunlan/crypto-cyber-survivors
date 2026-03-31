import { describe, it, expect, vi } from 'vitest';
import { MovementSystem } from '../../../../services/combat/physics/MovementSystem';
import { type IPoolManager } from '../../../../services/interfaces/IPoolManager';
import { type Player } from '../../../../types';

describe('MovementSystem', () => {
  it('should compile and basic update should run without errors', () => {
    const system = new MovementSystem();
    const mockPool = {
      activeEnemies: [],
      activeBullets: [],
      activeParticles: [],
      activeSpeedLines: [],
      activeFloatingTexts: [],
      activeGems: [],
      activeInteractables: [],
      getEnemy: vi.fn(),
      getBullet: vi.fn(),
      getParticle: vi.fn(),
      getFloatingText: vi.fn(),
      getGem: vi.fn(),
      getSpeedLine: vi.fn(),
      getInteractable: vi.fn(),
    } as unknown as IPoolManager;
    const mockPlayer = { x: 0, y: 0, radius: 10 } as Player;

    expect(() => {
      system.update(mockPool, 1, 800, 600, mockPlayer);
    }).not.toThrow();
  });
});
