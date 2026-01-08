import { type IPoolManager } from './interfaces/IPoolManager';
import { type ICombatSystem } from './interfaces/ICombatSystem';
import { type IAudioService } from './interfaces/IAudioService';
import { type IPhysicsSystem } from './interfaces/IPhysicsSystem';
import { type ISpawnSystem } from './interfaces/ISpawnSystem';

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
