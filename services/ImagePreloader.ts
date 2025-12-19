/**
 * ImagePreloader - Preloads and caches card images
 * 
 * Loads all card images at app startup to prevent
 * visual loading delays during LevelUp screen.
 */

import { ALL_CARDS_FLAT } from './CardSystem';
import { Logger } from './Logger';

class ImagePreloaderClass {
    private static instance: ImagePreloaderClass | null = null;

    // Cache for preloaded images
    private imageCache: Map<string, HTMLImageElement> = new Map();

    // Loading state
    private loadingPromise: Promise<void> | null = null;
    private isLoaded: boolean = false;

    private constructor() { }

    static getInstance(): ImagePreloaderClass {
        if (!ImagePreloaderClass.instance) {
            ImagePreloaderClass.instance = new ImagePreloaderClass();
        }
        return ImagePreloaderClass.instance;
    }

    /**
     * Get all unique image paths from card system
     */
    private getCardImagePaths(): string[] {
        const paths = new Set<string>();

        for (const card of ALL_CARDS_FLAT) {
            // Only include PNG/image paths, skip SVG component names and emoji
            if (card.icon.startsWith('/')) {
                paths.add(card.icon);
            }
        }

        return Array.from(paths);
    }

    /**
     * Preload a single image and cache it
     */
    private preloadImage(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            // Check if already cached
            const cached = this.imageCache.get(src);
            if (cached) {
                resolve(cached);
                return;
            }

            const img = new Image();
            img.onload = () => {
                this.imageCache.set(src, img);
                resolve(img);
            };
            img.onerror = () => {
                Logger.warn(`[ImagePreloader] Failed to load: ${src}`);
                reject(new Error(`Failed to load image: ${src}`));
            };
            img.src = src;
        });
    }

    /**
     * Preload all card images
     * Call this at app startup
     */
    async preloadAll(): Promise<void> {
        // If already loaded or loading, return existing promise
        if (this.isLoaded) return;
        if (this.loadingPromise) return this.loadingPromise;

        const paths = this.getCardImagePaths();
        Logger.info(`[ImagePreloader] Starting preload of ${paths.length} card images...`);

        this.loadingPromise = Promise.allSettled(
            paths.map(path => this.preloadImage(path))
        ).then(results => {
            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            Logger.info(`[ImagePreloader] Preload complete: ${succeeded} loaded, ${failed} failed`);
            this.isLoaded = true;
        });

        return this.loadingPromise;
    }

    /**
     * Get a preloaded image from cache
     * Returns undefined if not cached
     */
    getCached(src: string): HTMLImageElement | undefined {
        return this.imageCache.get(src);
    }

    /**
     * Check if preloading is complete
     */
    isPreloaded(): boolean {
        return this.isLoaded;
    }

    /**
     * Get preload progress (0-1)
     */
    getProgress(): number {
        if (this.isLoaded) return 1;
        const total = this.getCardImagePaths().length;
        if (total === 0) return 1;
        return this.imageCache.size / total;
    }

    /**
     * Clear cache (for testing or memory management)
     */
    clearCache(): void {
        this.imageCache.clear();
        this.isLoaded = false;
        this.loadingPromise = null;
    }
}

export const ImagePreloader = ImagePreloaderClass.getInstance();
