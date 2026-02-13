import { type IPoolManager } from '../interfaces/IPoolManager';
import { type ICombatSystem } from '../interfaces/ICombatSystem';
import { type IAudioService } from '../interfaces/IAudioService';
import { type IPhysicsSystem } from '../interfaces/IPhysicsSystem';
import { type ISpawnSystem } from '../interfaces/ISpawnSystem';

/**
 * EngineRegistry - Central registry for all game services.
 * Follows the Service Locator pattern for Dependency Inversion.
 */
class EngineRegistryClass {
  private poolManager?: IPoolManager;
  private combatSystem?: ICombatSystem;
  private audioService?: IAudioService;
  private physicsSystem?: IPhysicsSystem;
  private spawnSystem?: ISpawnSystem;

  setPoolManager(pool: IPoolManager): void {
    this.poolManager = pool;
  }

  getPoolManager(): IPoolManager {
    if (!this.poolManager) throw new Error('PoolManager not registered');
    return this.poolManager;
  }

  setCombatSystem(combat: ICombatSystem): void {
    this.combatSystem = combat;
  }

  getCombatSystem(): ICombatSystem {
    if (!this.combatSystem) throw new Error('CombatSystem not registered');
    return this.combatSystem;
  }

  setAudioService(audio: IAudioService): void {
    this.audioService = audio;
  }

  getAudioService(): IAudioService {
    if (!this.audioService) throw new Error('AudioService not registered');
    return this.audioService;
  }

  setPhysicsSystem(physics: IPhysicsSystem): void {
    this.physicsSystem = physics;
  }

  getPhysicsSystem(): IPhysicsSystem {
    if (!this.physicsSystem) throw new Error('PhysicsSystem not registered');
    return this.physicsSystem;
  }

  setSpawnSystem(spawn: ISpawnSystem): void {
    this.spawnSystem = spawn;
  }

  getSpawnSystem(): ISpawnSystem {
    if (!this.spawnSystem) throw new Error('SpawnSystem not registered');
    return this.spawnSystem;
  }
}

export const EngineRegistry = new EngineRegistryClass();
// Initialize eagerly or lazily?
// Since properties are undefined initially, we should probably set them or allow setters.
// The original code was:
// class EngineRegistryClass { ... }
// export const EngineRegistry = new EngineRegistryClass();
// It seems EngineRegistry doesn't instantiate the systems itself?
// Wait, I saw `this.collisionSystem = new CollisionSystem()` in my thought, but the `view_file` output (Step 61) SHOWS NO CONSTRUCTOR.
// It shows `setPoolManager`, `setCombatSystem`, etc.
// IT DOES NOT INSTANTIATE THEM.
// My previous thought about `EngineRegistry` containing `new CollisionSystem()` was WRONG based on the file content in Step 61.
// Step 61 shows `EngineRegistryClass` has `setCollisionSystem`? No, `setPhysicsSystem`.
// It seems `EngineRegistry` is just a holder.
// The *actual* instantiation must be happening elsewhere, likely `GameEngine.tsx` or `App.tsx`.
// I need to find where `new CollisionSystem()` is called.
