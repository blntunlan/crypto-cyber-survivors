import { type Player, type GameState } from '../../types';
import { type IPoolManager } from './IPoolManager';

export interface IMovementSystem {
  update(
    pool: IPoolManager,
    dtFactor: number,
    width: number,
    height: number,
    player: Player
  ): void;
}

export interface ICollisionSystem {
  update(
    pool: IPoolManager,
    player: Player,
    state: GameState,
    dtFactor: number,
    width: number,
    height: number,
    onGameOver: () => void
  ): void;
}

export interface ICollectionSystem {
  update(pool: IPoolManager, player: Player, state: GameState, dtFactor: number): void;
}
