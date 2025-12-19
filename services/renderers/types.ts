import { PoolManager } from '../poolManager';
import { GameState, Player, GameStatus } from '../../types';

export interface RenderOptions {
    width: number;
    height: number;
    status: GameStatus;
}

export interface IRenderer {
    render(
        ctx: CanvasRenderingContext2D,
        pool: PoolManager,
        state: GameState,
        player: Player,
        opts: RenderOptions
    ): void;
}
