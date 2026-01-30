/**
 * BrainLoader.ts
 * Utility to load trained neural network brains
 * Works both in browser and Node.js environments
 */

import { GameMasterBrain } from './GameMasterBrain';

let brainLoaded = false;

/**
 * Load the trained GameMaster brain from JSON file
 * Call this during game initialization
 */
export async function loadGameMasterBrain(): Promise<boolean> {
  if (brainLoaded) return true;

  try {
    // In browser, use fetch
    if (typeof window !== 'undefined') {
      const response = await fetch('/brain/gamemaster-FINAL.json');
      if (!response.ok) {
        console.warn(
          '[BrainLoader] gamemaster-FINAL.json not found, using random brain'
        );
        return false;
      }
      const data = await response.json();
      if (data?.brain) {
        brainLoaded = GameMasterBrain.loadBrain(data.brain);
        return brainLoaded;
      }
    } else {
      // Node.js environment (for testing/simulation)
      const fs = await import('fs');
      const path = await import('path');
      const brainPath = path.join(__dirname, 'brain', 'gamemaster-FINAL.json');

      if (fs.existsSync(brainPath)) {
        const content = fs.readFileSync(brainPath, 'utf-8');
        const data = JSON.parse(content);
        if (data?.brain) {
          brainLoaded = GameMasterBrain.loadBrain(data.brain);
          return brainLoaded;
        }
      }
    }
  } catch (error) {
    console.warn('[BrainLoader] Failed to load brain:', error);
  }

  return false;
}

/**
 * Check if a trained brain is currently loaded
 */
export function isGameMasterBrainLoaded(): boolean {
  return brainLoaded && GameMasterBrain.isUsingTrainedBrain();
}

/**
 * Reset brain loader state (for testing)
 */
export function resetBrainLoader(): void {
  brainLoaded = false;
}
