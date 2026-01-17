import { Logger } from './Logger';

export type SpriteId =
  | 'player_ship'
  | 'enemy_virus'
  | 'enemy_tank'
  | 'gem_xp'
  | 'gem_buff';

export class AssetService {
  private static instance: AssetService | null = null;
  private sprites: Map<SpriteId, HTMLImageElement> = new Map();
  private loaded = false;

  private constructor() {}

  public static getInstance(): AssetService {
    AssetService.instance ??= new AssetService();
    return AssetService.instance;
  }

  public async loadAssets(): Promise<void> {
    if (this.loaded) return;

    const assets: Record<SpriteId, string> = {
      player_ship: '/assets/sprites/player_ship.png',
      enemy_virus: '/assets/sprites/enemy_virus.png',
      enemy_tank: '/assets/sprites/enemy_tank.png',
      gem_xp: '', // Placeholder if we get gem sprites later
      gem_buff: '',
    };

    const promises = Object.entries(assets).map(([key, src]) => {
      if (!src) return Promise.resolve();

      return new Promise<void>(resolve => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          this.sprites.set(key as SpriteId, img);
          resolve();
        };
        img.onerror = e => {
          Logger.warn(`[AssetService] Failed to load sprite: ${key}`, e);
          // Don't reject, just continue so game doesn't crash
          resolve();
        };
      });
    });

    await Promise.all(promises);
    this.loaded = true;
    Logger.info('[AssetService] All assets loaded');
  }

  public getSprite(id: SpriteId): HTMLImageElement | undefined {
    return this.sprites.get(id);
  }
}

export const activeAssetService = AssetService.getInstance();
