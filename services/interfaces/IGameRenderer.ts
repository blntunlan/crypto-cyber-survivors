import { type GameStatus, type Player, type GameState } from '../../types';
import { type IPoolManager } from './IPoolManager';
import { type GraphicsConfig } from '../renderers/types';

/**
 * Interface for the Game Renderer.
 * Handles rendering of all game entities and effects to the canvas.
 */
export interface IGameRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: GameState,
    player: Player,
    pool: IPoolManager,
    status: GameStatus,
    graphics?: GraphicsConfig
  ): void;

  updateBackgroundCandles(
    state: GameState,
    pnl: number,
    waveMultiplier: number,
    dtFactor: number,
    width: number,
    height: number
  ): void;
}
