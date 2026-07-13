import { CombatSystem } from '../combat/CombatSystem';
import { PoolManager } from '../combat/PoolManager';
import { PhysicsSystem } from '../combat/PhysicsSystem';
import { SpawnSystem } from '../combat/SpawnSystem';
import { SpawnExecutor } from '../combat/SpawnExecutor';
import { CollisionSystem } from '../combat/physics/CollisionSystem';
import { difficultyContext } from '../difficulty/DifficultyContext';
import { type ICombatSystem } from '../interfaces/ICombatSystem';
import { type IGameRenderer } from '../interfaces/IGameRenderer';
import { type IPhysicsSystem } from '../interfaces/IPhysicsSystem';
import { type ISpawnSystem } from '../interfaces/ISpawnSystem';
import { GameRenderer } from '../renderers/GameRenderer';
import { ProjectileRenderer } from '../renderers/ProjectileRenderer';
import { audio } from '../audio';
import { DirectorSpawnOrchestrator } from '../director/DirectorSpawnOrchestrator';
import { MarketAudioReactor } from '../audio/MarketAudioReactor';
import { PresentationDirector } from '../presentation/PresentationDirector';
import { createGamePresentationCueAdapter } from '../presentation/GamePresentationCueAdapter';
import { type EventBusPresentationCueAdapter } from '../presentation/EventBusPresentationCueAdapter';

export type GameRuntime = {
  poolManager: PoolManager;
  renderer: IGameRenderer;
  combatSystem: ICombatSystem;
  physicsSystem: IPhysicsSystem;
  spawnSystem: ISpawnSystem;
  spawnExecutor: SpawnExecutor;
  directorSpawnOrchestrator: DirectorSpawnOrchestrator;
  presentationDirector: PresentationDirector;
  presentationCueAdapter: EventBusPresentationCueAdapter;
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
  const spawnExecutor = new SpawnExecutor();
  const directorSpawnOrchestrator = new DirectorSpawnOrchestrator();
  const presentationDirector = new PresentationDirector();
  const presentationCueAdapter = createGamePresentationCueAdapter();

  const reset = () => {
    poolManager.clearAll();
    spawnSystem.reset();
    directorSpawnOrchestrator.reset();
    difficultyContext.reset();
    presentationDirector.reset();
    MarketAudioReactor.clearPresentationAmbience();
  };

  const dispose = () => {
    difficultyContext.reset();
    presentationDirector.reset();
    MarketAudioReactor.clearPresentationAmbience();

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
    spawnExecutor,
    directorSpawnOrchestrator,
    presentationDirector,
    presentationCueAdapter,
    difficultyContext,
    reset,
    dispose,
  };
}
