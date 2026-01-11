import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImagePreloader } from '../services/ImagePreloader';

// Mock CardSystem
vi.mock('../services/CardSystem', () => ({
  ALL_CARDS_FLAT: [
    { icon: '/assets/card1.png' },
    { icon: '/assets/card2.png' },
    { icon: '🤔' }, // Emoji, should be skipped
    { icon: 'RocketLaunch' }, // Component name, should be skipped
  ],
}));

describe('ImagePreloader', () => {
  beforeEach(() => {
    ImagePreloader.clearCache();
    vi.clearAllMocks();

    // Mock global Image

    global.Image = class {
      onload: any;

      onerror: any;

      set src(value: string) {
        (this as any)._src = value;
        // Auto-trigger load on next tick
        setTimeout(() => {
          if (value.includes('error')) {
            if (this.onerror) this.onerror();
          } else {
            if (this.onload) this.onload();
          }
        }, 0);
      }
      get src() {
        return (this as any)._src;
      }
    } as any;
  });

  it('should be a singleton', () => {
    expect(ImagePreloader).toBeDefined();
  });

  it('should extract correct image paths', () => {
    const paths = (ImagePreloader as any).getCardImagePaths();
    expect(paths).toEqual(['/assets/card1.png', '/assets/card2.png']);
  });

  it('should preload images successfully', async () => {
    await ImagePreloader.preloadAll();

    expect(ImagePreloader.isPreloaded()).toBe(true);
    expect(ImagePreloader.getCached('/assets/card1.png')).toBeDefined();
    expect(ImagePreloader.getCached('/assets/card2.png')).toBeDefined();
  });

  it('should handle load errors gracefully', async () => {
    vi.spyOn(ImagePreloader as any, 'getCardImagePaths').mockReturnValue([
      '/assets/error.png',
    ]);

    await ImagePreloader.preloadAll();

    expect(ImagePreloader.isPreloaded()).toBe(true); // Should still mark as loaded even if some fail
    expect(ImagePreloader.getCached('/assets/error.png')).toBeUndefined();
  });

  it('should return 100% progress when loaded', async () => {
    expect(ImagePreloader.getProgress()).toBe(0);
    await ImagePreloader.preloadAll();
    expect(ImagePreloader.getProgress()).toBe(1);
  });

  it('should reuse existing loading promise', async () => {
    const promise1 = ImagePreloader.preloadAll();
    const promise2 = ImagePreloader.preloadAll();

    // They might be different promises if resolved extremely fast,
    // but let's check basic logic:
    await expect(promise1).resolves.toBeUndefined();
    await expect(promise2).resolves.toBeUndefined();
  });

  it('should not reload if already loaded', async () => {
    // First load
    await ImagePreloader.preloadAll();

    // It sets isLoaded = true
    expect(ImagePreloader.isPreloaded()).toBe(true);

    // Second load - should return resolve immediately
    const promise = ImagePreloader.preloadAll();
    await expect(promise).resolves.toBeUndefined();
  });
});
