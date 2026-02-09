/**
 * RealDataTrainer.ts - Train the Game Master Brain using historical market data
 * and REAL Game Logic (SpawnSystem & DifficultyManager formulas).
 */
/* eslint-disable no-console */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as synaptic from 'synaptic';

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

// ============================================================================
// CONFIGURATION (Matching Production)
// ============================================================================

const CONFIG = {
  POPULATION_SIZE: 30,
  GENERATIONS: 50,
  ELITE_PERCENT: 0.15,
  MUTATION_RATE: 0.2,
  CROSSOVER_RATE: 0.7,
  WINDOW_SIZE: 300,
};

const GAME_CONFIG = {
  GRACE_PERIOD_SECONDS: 20,
  IDEAL_HP: 50,
  HP_TOLERANCE: 15,
  MAX_ENEMIES: 100,
  BASE_SPAWN_INTERVAL: 1500, // Matching ENEMY_SPAWN.BASE_INTERVAL
};

// ============================================================================
// HELPERS
// ============================================================================

class LightRSICalculator {
  private prices: number[] = [];
  private period = 7;

  update(price: number): number {
    this.prices.push(price);
    if (this.prices.length > this.period + 1) this.prices.shift();
    if (this.prices.length < this.period + 1) return 50;

    let gains = 0;
    let losses = 0;
    for (let i = 1; i < this.prices.length; i++) {
      const current = this.prices[i];
      const prev = this.prices[i - 1];
      if (current !== undefined && prev !== undefined) {
        const diff = current - prev;
        if (diff > 0) gains += diff;
        else losses += Math.abs(diff);
      }
    }

    if (losses === 0) return 100;
    const rs = gains / this.period / (losses / this.period);
    return 100 - 100 / (1 + rs);
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ============================================================================
// SIMULATION
// ============================================================================

interface PricePoint {
  price: number;
  volume: number;
  timestamp: number;
  high: number;
  low: number;
}

function simulateGame(
  brain: NeuralNetwork,
  history: PricePoint[],
  leverage: number
): { fitness: number; survivalTime: number; kills: number } {
  let playerHP = 100;
  const playerMaxHP = 100;
  let playerLevel = 1;
  let playerXP = 0;
  let kills = 0;
  let enemies = 0;
  const hpHistory: number[] = [];

  // Real SpawnSystem State
  let spawnTimer = 0;

  const rsiCalc = new LightRSICalculator();
  const entryPrice = history[0]?.price ?? 70000;

  let lastPnL = 0;
  let pnlMomentum = 0;
  let lastVolume = history[0]?.volume ?? 1;
  let volumeMomentum = 0;

  for (let tick = 0; tick < history.length && playerHP > 0; tick++) {
    const point = history[tick]!;
    const elapsedSeconds = tick;

    // 1. Prepare Market Inputs
    const rsi = rsiCalc.update(point.price) / 100;
    const volume = Math.min(1, point.volume / 10);
    const rawPnL = (point.price - entryPrice) / entryPrice;
    const currentPnL = rawPnL * leverage;

    pnlMomentum = pnlMomentum * 0.8 + (currentPnL - lastPnL) * 0.2;
    volumeMomentum = volumeMomentum * 0.8 + (volume - lastVolume) * 0.2;
    lastPnL = currentPnL;
    lastVolume = volume;

    // 2. AI Brain Activation (Matching GameMasterBrain sensors)
    const stress = 1 - playerHP / playerMaxHP;
    const inputs = [
      rsi,
      0.5, // macd
      0.2, // atr (simplified)
      volume,
      clamp((volumeMomentum * 10 + 1) / 2, 0, 1),
      rsi > 0.6 ? 1 : rsi < 0.4 ? 0 : 0.5,
      clamp((pnlMomentum * 5 + 1) / 2, 0, 1),
      clamp((currentPnL + 1) / 2, 0, 1),
      stress,
      0.5, // DPS
      Math.min(1, kills / 100),
      elapsedSeconds / 900,
      playerLevel / 30,
      0.1, // luck
      Math.min(1, enemies / 50),
      leverage / 100,
    ];

    const raw = brain.activate(inputs);

    // 3. Map Brain Outputs (Matching GameMasterBrain outputs)
    const gm = {
      spawnRate: 0.3 + raw[0]! * 2.2, // 0.3 - 2.5
      enemySpeed: 0.6 + raw[1]! * 1.2, // 0.6 - 1.8
      enemyHP: 0.7 + raw[2]! * 1.3, // 0.7 - 2.0
      enemyDamage: 0.7 + raw[3]! * 1.3, // 0.7 - 2.0
      gemValueMultiplier: 0.5 + raw[5]! * 2.0, // 0.5 - 2.5
      mercyWindow: raw[11]!, // 0-1
    };

    // 4. REAL DifficultyManager Logic (Simplified version)
    // In production: spawnRate = clamp(total * scale.spawn * gm.spawnRate, ...)
    const timeRamp = 1.0 + (elapsedSeconds / 60) * 0.05;
    const pnlFactor =
      currentPnL < 0
        ? Math.min(3.0, 1.0 + Math.log1p(Math.abs(currentPnL) * 10) * 0.4)
        : Math.max(0.7, 1.0 - Math.log1p(currentPnL * 5) * 0.15);

    const totalDifficulty = timeRamp * pnlFactor * (1.0 + (playerLevel - 1) * 0.1);

    // Leverage-based spawn scale (Production constant)
    const levSpawnScale = leverage >= 100 ? 6.0 : leverage >= 50 ? 4.0 : 1.2;

    // Final output used by SpawnSystem
    const finalSpawnMultiplier = clamp(
      totalDifficulty * levSpawnScale * gm.spawnRate,
      0.5,
      10.0
    );

    // 5. REAL SpawnSystem logic (Timer-based)
    spawnTimer += 1000; // 1 second data points
    const spawnThreshold = GAME_CONFIG.BASE_SPAWN_INTERVAL / finalSpawnMultiplier;

    let spawnedThisTick = 0;
    while (spawnTimer > spawnThreshold && spawnedThisTick < 5) {
      if (enemies < GAME_CONFIG.MAX_ENEMIES) {
        enemies++;
        spawnedThisTick++;
      }
      spawnTimer -= spawnThreshold;
    }

    // 6. Combat Simulation
    const playerDamage = (1 + playerLevel * 0.5) * 60; // Scale 1s tick
    const killsThisTick = Math.min(enemies, playerDamage / (10 * gm.enemyHP));
    enemies -= killsThisTick;
    kills += killsThisTick;

    const riskFactor = currentPnL < -0.05 ? Math.abs(currentPnL) * 2 : 0;
    const dynamicGemMultiplier = gm.gemValueMultiplier * (1 + riskFactor);

    playerXP += killsThisTick * 10 * dynamicGemMultiplier;
    if (playerXP >= playerLevel * 100) {
      playerXP = 0;
      playerLevel++;
      playerHP = Math.min(playerMaxHP, playerHP + 20);
    }

    // Damage based on SpawnSystem outputs
    const damage =
      enemies * 0.5 * gm.enemyDamage * gm.enemySpeed * (1 - gm.mercyWindow * 0.5);
    playerHP -= damage;
    playerHP = Math.min(playerMaxHP, playerHP + 0.5); // Regen

    hpHistory.push(playerHP);
  }

  // Fitness calculation
  const survivalTime = hpHistory.length;
  const avgHP = hpHistory.reduce((a, b) => a + b, 0) / (hpHistory.length || 1);
  const hpDeviation = Math.abs(avgHP - GAME_CONFIG.IDEAL_HP);
  const flowScore = Math.max(0, 100 - hpDeviation * 2);

  return {
    fitness: flowScore + survivalTime * 2 + kills * 0.5,
    survivalTime,
    kills,
  };
}

// ============================================================================
// MAIN (Evolution Loop)
// ============================================================================

async function train() {
  const dataPath = path.join(__dirname, 'historical_data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Run fetch_training_data.ts first!');
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as PricePoint[];
  const scenarios: PricePoint[][] = [];
  for (let i = 0; i < rawData.length - CONFIG.WINDOW_SIZE; i += 50) {
    scenarios.push(rawData.slice(i, i + CONFIG.WINDOW_SIZE));
  }

  let population = Array.from({ length: CONFIG.POPULATION_SIZE }, () => ({
    brain: new Architect.Perceptron(16, 22, 13),
    fitness: 0,
  }));

  console.log('🚀 Training AI with REAL SpawnSystem Logic & Price History...');

  for (let gen = 1; gen <= CONFIG.GENERATIONS; gen++) {
    for (const genome of population) {
      let totalFitness = 0;
      const testScenarios = scenarios.sort(() => Math.random() - 0.5).slice(0, 3);
      for (const scene of testScenarios) {
        totalFitness += simulateGame(genome.brain, scene, 25).fitness; // Test with mid-high leverage
      }
      genome.fitness = totalFitness / 3;
    }

    population.sort((a, b) => b.fitness - a.fitness);
    const best = population[0]!;
    console.log(
      `Gen ${gen}/${CONFIG.GENERATIONS} | Best Fitness: ${best.fitness.toFixed(1)}`
    );

    if (gen < CONFIG.GENERATIONS) {
      const elite = population.slice(
        0,
        Math.floor(CONFIG.POPULATION_SIZE * CONFIG.ELITE_PERCENT)
      );
      population = population.map(() => ({
        brain: NetworkLib.fromJSON(
          elite[Math.floor(Math.random() * elite.length)]!.brain.toJSON()
        ),
        fitness: 0,
      }));
    }

    if (gen === CONFIG.GENERATIONS) {
      const brainDir = path.join(__dirname, '../../services/difficulty/brain');
      fs.writeFileSync(
        path.join(brainDir, 'gamemaster-REALDATA.json'),
        JSON.stringify({ brain: best.brain.toJSON() }, null, 2)
      );
      console.log('✅ Final brain trained with REAL game mechanics saved!');
    }
  }
}

train().catch(console.error);
