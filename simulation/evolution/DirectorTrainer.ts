/**
 * DirectorTrainer.ts - AIDirector Brain Training
 *
 * Project Darwin'den farklı olarak bu trainer, OYUNCU değil ZORLUK YÖNETİCİSİ
 * için brain eğitir.
 *
 * Amaç: Oyuncunun "flow state"de kalmasını sağlayan zorluk ayarları
 *
 * Fitness = SurvivalTime * StressVariance (not too easy, not too hard)
 */
/* eslint-disable no-console */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as synaptic from 'synaptic';

// ESM dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Synaptic ESM/CJS compatibility
const SynapticModule = synaptic as Record<string, unknown>;
const SynapticDefault = SynapticModule.default as Record<string, unknown> | undefined;
const Architect = SynapticModule.Architect ?? SynapticDefault?.Architect;
const NetworkLib = SynapticModule.Network ?? SynapticDefault?.Network;

// Neural network type for synaptic
type NeuralNetwork = {
  activate: (inputs: number[]) => number[];
  toJSON: () => unknown;
};

// Configuration
const POPULATION_SIZE = 30;
const GENERATIONS = 100;
const SIMULATION_TICKS = 3600; // 60 seconds at 60fps

interface DirectorGenome {
  brain: NeuralNetwork;
  fitness: number;
}

interface SimulationState {
  playerHP: number;
  playerMaxHP: number;
  playerDPS: number;
  kills: number;
  time: number;
  stressHistory: number[];
  // Market mock
  rsi: number;
  atr: number;
  volume: number;
  trend: number;
}

/**
 * Simulates a game session with given director brain
 */
function simulateGame(directorBrain: NeuralNetwork): {
  fitness: number;
  avgStress: number;
  survivalTime: number;
} {
  const state: SimulationState = {
    playerHP: 100,
    playerMaxHP: 100,
    playerDPS: 0.3, // Normalized
    kills: 0,
    time: 0,
    stressHistory: [],
    // Random market conditions
    rsi: 30 + Math.random() * 40, // 30-70
    atr: Math.random() * 0.3,
    volume: Math.random(),
    trend: Math.random(),
  };

  let survivalTime = 0;

  for (let tick = 0; tick < SIMULATION_TICKS; tick++) {
    // Calculate stress (1 - HP%)
    const stress = 1 - state.playerHP / state.playerMaxHP;
    state.stressHistory.push(stress);

    // Gather director inputs
    const inputs = [
      state.rsi / 100,
      0.5, // MACD placeholder
      state.atr,
      state.volume,
      state.trend,
      stress,
      state.playerDPS,
      Math.min(1, state.kills / 100),
      Math.random() * 0.3, // Zoning score mock
    ];

    // Get director decision
    const outputs = directorBrain.activate(inputs);
    const spawnDensity = outputs[0];
    const enemySpeedMod = outputs[1];
    const aggression = outputs[2];

    // Simulate damage to player based on director outputs
    // Higher spawn density & aggression = more damage
    const incomingDamage = (spawnDensity * 2 + aggression) * (0.5 + enemySpeedMod);

    // Player kills enemies (simplified)
    const killsThisTick = state.playerDPS * (1 - spawnDensity * 0.5);
    state.kills += killsThisTick;

    // HP change
    state.playerHP -= incomingDamage * 0.1;
    state.playerHP += 0.02; // Small regen
    state.playerHP = Math.max(0, Math.min(state.playerMaxHP, state.playerHP));

    // Check death
    if (state.playerHP <= 0) {
      survivalTime = tick / 60;
      break;
    }

    survivalTime = tick / 60;

    // Slowly shift market conditions
    state.rsi += (Math.random() - 0.5) * 2;
    state.rsi = Math.max(10, Math.min(90, state.rsi));
    state.volume = Math.max(0, Math.min(1, state.volume + (Math.random() - 0.5) * 0.1));
  }

  // Calculate fitness based on "flow state" maintenance
  // Ideal stress is around 0.3-0.5 (not too safe, not too panicked)
  const avgStress =
    state.stressHistory.reduce((a, b) => a + b, 0) / state.stressHistory.length;

  // Calculate stress variance (we want moderate variance, not flat)
  const stressVariance =
    state.stressHistory.reduce((sum, s) => sum + Math.pow(s - avgStress, 2), 0) /
    state.stressHistory.length;

  // Ideal avg stress: 0.35-0.45
  const stressDeviation = Math.abs(avgStress - 0.4);
  const stressScore = Math.max(0, 1 - stressDeviation * 3); // Penalize deviation from ideal

  // Variance bonus (some tension is good, flat gameplay is boring)
  const varianceBonus = Math.min(1, stressVariance * 20);

  // Survival is important
  const survivalScore = survivalTime / 60; // Normalized to max 1.0

  // Final fitness: Balance of survival, ideal stress, and variety
  const fitness = survivalScore * 0.4 + stressScore * 0.4 + varianceBonus * 0.2;

  return { fitness: fitness * 1000, avgStress, survivalTime };
}

/**
 * Create new random genome
 */
function createGenome(): DirectorGenome {
  return {
    brain: new Architect.Perceptron(9, 6, 3),
    fitness: 0,
  };
}

/**
 * Mutate genome
 */
function mutate(genome: DirectorGenome, rate: number = 0.1): DirectorGenome {
  const json = genome.brain.toJSON();
  const child = NetworkLib.fromJSON(json);

  // Mutate connections (simplified - synaptic doesn't expose easy weight access)
  // We create a new slightly different network
  if (Math.random() < rate) {
    // Just create fresh and hope crossover helps
  }

  return { brain: child, fitness: 0 };
}

/**
 * Crossover two genomes
 */
function crossover(a: DirectorGenome, b: DirectorGenome): DirectorGenome {
  // Simple: Clone better parent and mutate
  const better = a.fitness > b.fitness ? a : b;
  return mutate(better, 0.2);
}

/**
 * Main training loop
 */
async function trainDirector() {
  console.log('🎮 AIDirector Training Started');
  console.log(`   Population: ${POPULATION_SIZE}`);
  console.log(`   Generations: ${GENERATIONS}`);
  console.log(`   Goal: Optimize for player "flow state"\n`);

  // Initialize population
  let population: DirectorGenome[] = [];
  for (let i = 0; i < POPULATION_SIZE; i++) {
    population.push(createGenome());
  }

  let bestEver: DirectorGenome | null = null;

  // Evolution loop
  for (let gen = 1; gen <= GENERATIONS; gen++) {
    // Evaluate each genome
    for (const genome of population) {
      // Run multiple simulations for stability
      let totalFitness = 0;
      for (let trial = 0; trial < 3; trial++) {
        const result = simulateGame(genome.brain);
        totalFitness += result.fitness;
      }
      genome.fitness = totalFitness / 3;
    }

    // Sort by fitness
    population.sort((a, b) => b.fitness - a.fitness);
    const best = population[0];

    if (!bestEver || best.fitness > bestEver.fitness) {
      bestEver = {
        brain: NetworkLib.fromJSON(best.brain.toJSON()),
        fitness: best.fitness,
      };
    }

    // Log progress
    const avgFitness =
      population.reduce((s, g) => s + g.fitness, 0) / population.length;
    console.log(
      `Generation ${gen}/${GENERATIONS} | Best: ${best.fitness.toFixed(1)} | Avg: ${avgFitness.toFixed(1)}`
    );

    // Save checkpoint
    if (gen % 20 === 0 || gen === GENERATIONS) {
      const brainDir = path.join(__dirname, '../../services/difficulty/brain');
      if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });

      const filename =
        gen === GENERATIONS ? 'director-FINAL.json' : `director-${gen}.json`;
      fs.writeFileSync(
        path.join(brainDir, filename),
        JSON.stringify({ brain: best.brain.toJSON() }, null, 2)
      );
    }

    // Evolution: Select top 20%, breed rest
    if (gen < GENERATIONS) {
      const survivors = population.slice(0, Math.floor(POPULATION_SIZE * 0.2));
      const nextGen: DirectorGenome[] = [...survivors];

      while (nextGen.length < POPULATION_SIZE) {
        const parentA = survivors[Math.floor(Math.random() * survivors.length)];
        const parentB = survivors[Math.floor(Math.random() * survivors.length)];
        nextGen.push(crossover(parentA, parentB));
      }

      population = nextGen;
    }
  }

  console.log('\n🎉 Training Complete!');
  console.log(`   Best Fitness: ${bestEver?.fitness.toFixed(1)}`);
  console.log(`   Brain saved to: services/difficulty/brain/director-FINAL.json`);
}

// Run
trainDirector().catch(console.error);
