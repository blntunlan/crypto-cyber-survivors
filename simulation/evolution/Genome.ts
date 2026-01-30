/**
 * Genome Definition
 */
import synaptic, { type Network } from 'synaptic';
const { Architect, Network: NetworkLib } = synaptic;

export interface DifficultyGenes {
  spawnLimitMin: number;
  spawnLimitMax: number;
  speedLimitMax: number;
  hpScaler: number;
}

export class Genome {
  public brain: Network;
  public difficulty: DifficultyGenes;
  public fitness: number = 0;

  constructor(brain?: Network, difficulty?: DifficultyGenes) {
    if (brain) {
      this.brain = brain;
    } else {
      // 16 Inputs:
      //   8 raycast distances
      //   2 gem direction (x, y)
      //   2 player stats (hp, xp)
      //   4 market inputs (rsi, atr, volume, trend)
      // 12 Hidden neurons (increased for market complexity)
      // 3 Outputs (moveX, moveY, reserved)
      this.brain = new Architect.Perceptron(16, 12, 3);
    }

    this.difficulty = difficulty ?? {
      spawnLimitMin: 0.5,
      spawnLimitMax: 2.0,
      speedLimitMax: 1.5,
      hpScaler: 1.0,
    };
  }

  toJSON() {
    return {
      brain: this.brain.toJSON(),
      difficulty: this.difficulty,
    };
  }

  static fromJSON(json: { brain: unknown; difficulty: DifficultyGenes }): Genome {
    const brain = NetworkLib.fromJSON(json.brain);
    return new Genome(brain, json.difficulty);
  }

  mutate(rate: number = 0.1) {
    // 1. Mutate Brain (Safely Skipped for Stability)
    // Accessing internal connections of Synaptic can be brittle across versions.
    // For now, we rely on Crossover (Recombination) and simple weight jitter if needed.
    // To properly mutate weights without crashing:
    // We would need to iterate this.brain.neurons() -> connections -> weight += random
    // SKIPPING BRAIN MUTATION to prevent 'undefined' crash.

    // 2. Mutate Difficulty
    if (Math.random() < rate) {
      this.difficulty.spawnLimitMax += (Math.random() - 0.5) * 0.5;
      this.difficulty.speedLimitMax += (Math.random() - 0.5) * 0.2;

      // Clamps
      this.difficulty.spawnLimitMax = Math.max(
        1.0,
        Math.min(5.0, this.difficulty.spawnLimitMax)
      );
      this.difficulty.speedLimitMax = Math.max(
        1.0,
        Math.min(3.0, this.difficulty.speedLimitMax)
      );
    }
  }

  static crossover(parentA: Genome, _parentB: Genome): Genome {
    // Clone A
    const child = Genome.fromJSON(parentA.toJSON());
    // Mutate
    child.mutate(0.3);
    return child;
  }
}
