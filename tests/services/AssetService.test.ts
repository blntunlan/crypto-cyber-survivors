import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetService } from '../../services/system/AssetService';
import { Logger } from '../../services/system/Logger';

// Mock Logger
vi.mock('../../services/system/Logger', () => ({
  Logger: {
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('AssetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset instance for testing
    (AssetService as any).instance = null;
  });

  it('should load assets and mark as loaded', async () => {
    const service = AssetService.getInstance();

    // Mock Image constructor
    global.Image = class {
      private _src: string = '';
      onload: (() => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
      get src() {
        return this._src;
      }
    } as any;

    await service.loadAssets();
    expect(Logger.info).toHaveBeenCalledWith(
      expect.stringContaining('All assets loaded')
    );

    // Subsequent calls should return immediately
    await service.loadAssets();
    expect(Logger.info).toHaveBeenCalledTimes(1);
  });

  it('should handle load errors gracefully', async () => {
    const service = AssetService.getInstance();

    global.Image = class {
      private _src: string = '';
      onload: (() => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (this.onerror) this.onerror(new Error('Failed'));
        }, 0);
      }
      get src() {
        return this._src;
      }
    } as any;

    await service.loadAssets();
    expect(Logger.warn).toHaveBeenCalled();
  });

  it('should return undefined for missing sprites', () => {
    const service = AssetService.getInstance();
    expect(service.getSprite('player_ship' as any)).toBeUndefined();
  });
});
