import { CombatSystem } from '../combat/CombatSystem';
import { PoolManager } from '../combat/PoolManager';
import { PhysicsSystem } from '../combat/PhysicsSystem';
import { SpawnSystem } from '../combat/SpawnSystem';
import { CollisionSystem } from '../combat/physics/CollisionSystem';
import { EngineRegistry } from '../core/EngineRegistry';
import { difficultyContext } from '../difficulty/DifficultyContext';
import { type ICombatSystem } from '../interfaces/ICombatSystem';
import { type IGameRenderer } from '../interfaces/IGameRenderer';
import { type IPhysicsSystem } from '../interfaces/IPhysicsSystem';
import { type ISpawnSystem } from '../interfaces/ISpawnSystem';
import { GameRenderer } from '../renderers/GameRenderer';
import { ProjectileRenderer } from '../renderers/ProjectileRenderer';
import { audio } from '../audio';

export type GameRuntime = {
  poolManager: PoolManager;
  renderer: IGameRenderer;
  combatSystem: ICombatSystem;
  physicsSystem: IPhysicsSystem;
  spawnSystem: ISpawnSystem;
  difficultyContext: typeof difficultyContext;
  reset: () => void;
  dispose: () => void;
};

export function createGameRuntime(): GameRuntime {
  const poolManager = new PoolManager();
  const renderer = new GameRenderer(
    undefined,
    undefined,
    new ProjectileRenderer(),
    undefined
  );
  const combatSystem = new CombatSystem(audio);
  const physicsSystem = new PhysicsSystem(undefined, new CollisionSystem(), undefined);
  const spawnSystem = new SpawnSystem();

  EngineRegistry.setPoolManager(poolManager);
  EngineRegistry.setCombatSystem(combatSystem);
  EngineRegistry.setPhysicsSystem(physicsSystem);
  EngineRegistry.setSpawnSystem(spawnSystem);
  EngineRegistry.setAudioService(audio);

  const reset = () => {
    poolManager.clearAll();
    spawnSystem.reset();
    difficultyContext.reset();
  };

  const dispose = () => {
    difficultyContext.reset();

    if ('dispose' in spawnSystem && typeof spawnSystem.dispose === 'function') {
      spawnSystem.dispose();
    } else {
      spawnSystem.reset();
    }

    if ('dispose' in poolManager && typeof poolManager.dispose === 'function') {
      poolManager.dispose();
    } else {
      poolManager.clearAll();
    }
  };

  return {
    poolManager,
    renderer,
    combatSystem,
    physicsSystem,
    spawnSystem,
    difficultyContext,
    reset,
    dispose,
  };
}
