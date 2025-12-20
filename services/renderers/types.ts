import { PoolManager } from '../poolManager';
import { GameState, Player, GameStatus } from '../../types';

export interface GraphicsConfig {
  showParticles: boolean;
  showDamageNumbers: boolean;
  showScreenShake: boolean;
}

export interface RenderOptions {
  width: number;
  height: number;
  status: GameStatus;
  graphics: GraphicsConfig;
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
