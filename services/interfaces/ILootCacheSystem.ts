import { type GameState, type Interactable, type Player } from '../../types';
import { type LootCacheDebugMode } from '../../types/lootCache';
import { type IPoolManager } from './IPoolManager';

export type LootCacheUpdateInput = {
  deltaMs: number;
  elapsedSeconds: number;
  width: number;
  height: number;
  reducedMotion: boolean;
  showParticles: boolean;
  particleMultiplier: number;
  pool: IPoolManager;
  player: Player;
  state: GameState;
};

export type LootCacheOpenInput = Omit<
  LootCacheUpdateInput,
  'deltaMs' | 'width' | 'height' | 'showParticles' | 'particleMultiplier'
>;

export interface ILootCacheSystem {
  update(input: LootCacheUpdateInput): void;
  tryOpen(cache: Interactable, input: LootCacheOpenInput): boolean;
  requestDebugSpawn(mode: LootCacheDebugMode): void;
  beginRun(seed: number, elapsedSeconds?: number): void;
  reset(): void;
  dispose(): void;
}
