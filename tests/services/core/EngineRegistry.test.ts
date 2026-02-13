import { describe, it, expect } from 'vitest';
import { EngineRegistry } from '../../../services/core/EngineRegistry';

describe('EngineRegistry', () => {
  it('stores and returns registered services', () => {
    const pool = {} as any;
    const combat = {} as any;
    const audio = {} as any;
    const physics = {} as any;
    const spawn = {} as any;

    EngineRegistry.setPoolManager(pool);
    EngineRegistry.setCombatSystem(combat);
    EngineRegistry.setAudioService(audio);
    EngineRegistry.setPhysicsSystem(physics);
    EngineRegistry.setSpawnSystem(spawn);

    expect(EngineRegistry.getPoolManager()).toBe(pool);
    expect(EngineRegistry.getCombatSystem()).toBe(combat);
    expect(EngineRegistry.getAudioService()).toBe(audio);
    expect(EngineRegistry.getPhysicsSystem()).toBe(physics);
    expect(EngineRegistry.getSpawnSystem()).toBe(spawn);
  });
});
