/**
 * GameMasterTrainer.ts - Train the Game Master Brain
 *
 * Fitness Goal: Maximize player "flow state" while respecting market conditions
 *
 * Flow State Metrics:
 * - HP stays around 50% (not too safe, not dying)
 * - Survival time is high (but not through being too easy)
 * - Stress variance exists (some tension, not flat)
 * - PnL affects difficulty appropriately
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
// CONFIGURATION
// ============================================================================

const CONFIG = {
  POPULATION_SIZE: 30,
  GENERATIONS: 60, // Slightly reduced for faster iteration
  SIMULATION_TICKS: 180 * 60, // 3 minutes at 60fps (faster training)
  ELITE_PERCENT: 0.15,
  MUTATION_RATE: 0.2,
  CROSSOVER_RATE: 0.7,
};

const GAME_CONFIG = {
  GRACE_PERIOD_TICKS: 24 * 60,
  IDEAL_HP: 50,
  HP_TOLERANCE: 15,
  MAX_ENEMIES: 100,
};

// ============================================================================
// MARKET SCENARIOS
// ============================================================================

interface MarketScenario {
  name: string;
  duration: number; // ticks
  rsiStart: number;
  rsiEnd: number;
  volatilityBase: number;
  volumePattern: 'steady' | 'spike' | 'declining';
  trendBias: number; // -1 bear, 0 sideways, 1 bull
}

const SCENARIOS: MarketScenario[] = [
  {
    name: 'steady_bull',
    duration: 900 * 60,
    rsiStart: 55,
    rsiEnd: 70,
    volatilityBase: 0.3,
    volumePattern: 'steady',
    trendBias: 0.7,
  },
  {
    name: 'gradual_bear',
    duration: 900 * 60,
    rsiStart: 50,
    rsiEnd: 30,
    volatilityBase: 0.4,
    volumePattern: 'steady',
    trendBias: -0.6,
  },
  {
    name: 'sideways_chop',
    duration: 900 * 60,
    rsiStart: 50,
    rsiEnd: 50,
    volatilityBase: 0.25,
    volumePattern: 'steady',
    trendBias: 0,
  },
  {
    name: 'volatile_pump',
    duration: 900 * 60,
    rsiStart: 45,
    rsiEnd: 80,
    volatilityBase: 0.6,
    volumePattern: 'spike',
    trendBias: 0.8,
  },
  {
    name: 'flash_crash',
    duration: 900 * 60,
    rsiStart: 60,
    rsiEnd: 20,
    volatilityBase: 0.8,
    volumePattern: 'spike',
    trendBias: -0.9,
  },
  {
    name: 'recovery_rally',
    duration: 900 * 60,
    rsiStart: 25,
    rsiEnd: 60,
    volatilityBase: 0.5,
    volumePattern: 'spike',
    trendBias: 0.6,
  },
];

// ============================================================================
// SIMULATION
// ============================================================================

interface SimState {
  tick: number;
  playerHP: number;
  playerMaxHP: number;
  playerLevel: number;
  playerXP: number;
  kills: number;
  gems: number;
  pnl: number;
  luck: number;
  enemies: number;
  hpHistory: number[];
  stressHistory: number[];
}

interface BrainOutputs {
  spawnRate: number;
  enemySpeed: number;
  enemyHP: number;
  enemyDamage: number;
  gemDropRate: number;
  gemValueMultiplier: number;
  xpMultiplier: number;
  whaleType: number;
  eventIntensity: number;
  aggression: number;
  chaos: number;
  mercyWindow: number;
  pressureRamp: number;
}

function getMarketState(scenario: MarketScenario, tick: number) {
  const progress = tick / scenario.duration;

  // RSI interpolation
  const rsi = scenario.rsiStart + (scenario.rsiEnd - scenario.rsiStart) * progress;

  // Volume with pattern
  let volume = 0.5;
  if (scenario.volumePattern === 'spike') {
    // Random spikes
    volume = 0.4 + Math.random() * 0.4;
    if (Math.random() < 0.02) volume = 0.7 + Math.random() * 0.3; // Spike
  } else if (scenario.volumePattern === 'declining') {
    volume = 0.6 - progress * 0.3;
  }

  // Volatility with some noise
  const volatility = scenario.volatilityBase + (Math.random() - 0.5) * 0.2;

  // Trend
  const trend = 0.5 + scenario.trendBias * 0.5;

  // PnL simulation based on trend and leverage
  const pnlChange = (trend - 0.5) * 0.001 + (Math.random() - 0.5) * 0.002;

  return {
    rsi: rsi / 100,
    macd: 0.5 + scenario.trendBias * 0.3,
    volatility: Math.min(1, volatility),
    volume,
    trend,
    pnlChange,
  };
}

function mapBrainOutput(raw: number[], graceFactor: number): BrainOutputs {
  const map = (val: number, min: number, max: number) =>
    min + Math.max(0, Math.min(1, val)) * (max - min);

  const outputs: BrainOutputs = {
    spawnRate: map(raw[0] ?? 0.5, 0.3, 2.5),
    enemySpeed: map(raw[1] ?? 0.5, 0.6, 1.8),
    enemyHP: map(raw[2] ?? 0.5, 0.7, 2.0),
    enemyDamage: map(raw[3] ?? 0.5, 0.7, 2.0),
    gemDropRate: map(raw[4] ?? 0.5, 0.4, 1.5),
    gemValueMultiplier: map(raw[5] ?? 0.5, 0.5, 2.5),
    xpMultiplier: map(raw[6] ?? 0.5, 0.6, 1.4),
    whaleType: 0,
    eventIntensity: map(raw[8] ?? 0.5, 0, 1),
    aggression: map(raw[9] ?? 0.5, 0, 1),
    chaos: map(raw[10] ?? 0.5, 0, 1),
    mercyWindow: map(raw[11] ?? 0.5, 0, 1),
    pressureRamp: map(raw[12] ?? 0.5, 0, 1),
  };

  // Apply grace period
  if (graceFactor < 1) {
    outputs.spawnRate = 1 + (outputs.spawnRate - 1) * graceFactor;
    outputs.enemySpeed = 1 + (outputs.enemySpeed - 1) * graceFactor;
    outputs.enemyDamage = 1 + (outputs.enemyDamage - 1) * graceFactor;
    outputs.chaos *= graceFactor;
    outputs.aggression *= graceFactor;
  }

  return outputs;
}

function simulateGame(
  brain: NeuralNetwork,
  scenario: MarketScenario,
  leverage: number
): {
  fitness: number;
  survivalTime: number;
  avgHP: number;
  hpVariance: number;
  kills: number;
  finalPnL: number;
} {
  const state: SimState = {
    tick: 0,
    playerHP: 100,
    playerMaxHP: 100,
    playerLevel: 1,
    playerXP: 0,
    kills: 0,
    gems: 0,
    pnl: 0,
    luck: 0.1, // Base luck
    enemies: 0,
    hpHistory: [],
    stressHistory: [],
  };

  const _DT = 1 / 60; // 60fps tick
  let survived = true;

  let lastPnL = 0;
  let lastVolume = 0.5;
  let pnlMomentum = 0;
  let volumeMomentum = 0;

  for (let tick = 0; tick < CONFIG.SIMULATION_TICKS && survived; tick++) {
    state.tick = tick;
    const elapsedSeconds = tick / 60;

    // Grace factor
    const graceFactor =
      tick < GAME_CONFIG.GRACE_PERIOD_TICKS
        ? 0
        : Math.min(1, (tick - GAME_CONFIG.GRACE_PERIOD_TICKS) / (10 * 60));

    // Get market state
    const market = getMarketState(scenario, tick);
    const pnlMove = market.pnlChange * leverage;
    state.pnl += pnlMove;
    state.pnl = Math.max(-1, Math.min(1, state.pnl));

    // Momentum
    pnlMomentum = pnlMomentum * 0.8 + (state.pnl - lastPnL) * 0.2;
    volumeMomentum = volumeMomentum * 0.8 + (market.volume - lastVolume) * 0.2;
    lastPnL = state.pnl;
    lastVolume = market.volume;

    // Prepare brain inputs (16)
    const stress = 1 - state.playerHP / state.playerMaxHP;
    const inputs = [
      market.rsi,
      market.macd,
      market.volatility,
      market.volume,
      Math.max(0, Math.min(1, (volumeMomentum * 10 + 1) / 2)),
      market.trend,
      Math.max(0, Math.min(1, (pnlMomentum * 5 + 1) / 2)),
      (state.pnl + 1) / 2, // Map -1..1 to 0..1
      stress,
      Math.min(1, state.kills / 500), // playerDPS proxy
      Math.min(1, state.kills / (elapsedSeconds || 1) / 2), // killEfficiency
      elapsedSeconds / 900, // elapsedTime normalized to 15min
      state.playerLevel / 30, // level
      state.luck, // luckStat
      Math.min(1, state.gems / 50), // zoningScore (gems piled = overwhelmed)
      leverage / 100, // leverage
    ];

    // Brain decision
    const raw = brain.activate(inputs);
    const outputs = mapBrainOutput(raw, graceFactor);

    // Apply PnL modifiers (as in GameMasterBrain)
    if (state.pnl < -0.05) {
      const severity = Math.min(1, Math.abs(state.pnl) / 0.25);
      outputs.spawnRate *= 1 + severity * 0.4;
      outputs.enemySpeed *= 1 + severity * 0.2;
      outputs.gemDropRate *= 1 - severity * 0.4;
      outputs.chaos = Math.min(1, outputs.chaos * (1 + severity * 0.5));

      // Market Distress Reward
      const riskFactor = Math.abs(state.pnl) * 2;
      outputs.gemValueMultiplier = Math.min(
        2.5,
        outputs.gemValueMultiplier * (1 + riskFactor)
      );
    } else if (state.pnl > 0.02) {
      outputs.chaos *= 0.7;
      outputs.aggression *= 0.85;
      outputs.spawnRate *= 1.1;
    }

    // Flow state corrections
    const hpPercent = state.playerHP;
    const tolerance = Math.max(
      5,
      GAME_CONFIG.HP_TOLERANCE * (1 - (leverage / 100) * 0.6)
    );

    if (hpPercent > GAME_CONFIG.IDEAL_HP + tolerance) {
      const comfort = (hpPercent - GAME_CONFIG.IDEAL_HP - tolerance) / 35;
      outputs.enemySpeed *= 1 + comfort * 0.4;
      outputs.spawnRate *= 1 + comfort * 0.25;
    } else if (hpPercent < GAME_CONFIG.IDEAL_HP - tolerance) {
      const struggle = (GAME_CONFIG.IDEAL_HP - tolerance - hpPercent) / 35;
      outputs.mercyWindow = Math.min(1, outputs.mercyWindow + struggle * 0.5);
      outputs.spawnRate *= 1 - struggle * 0.3;
      outputs.gemDropRate *= 1 + struggle * 0.2;
    }

    // Simulate enemy spawning
    const spawnChance = outputs.spawnRate * 0.02 * (1 + outputs.chaos * 0.3);
    if (Math.random() < spawnChance && state.enemies < GAME_CONFIG.MAX_ENEMIES) {
      state.enemies++;
    }

    // Simulate combat
    const playerDamagePerTick = 0.5 + state.playerLevel * 0.1;
    const enemyKillsThisTick = Math.min(
      state.enemies,
      playerDamagePerTick / (10 * outputs.enemyHP)
    );
    state.enemies = Math.max(0, state.enemies - enemyKillsThisTick);
    state.kills += enemyKillsThisTick;

    // Gems and XP
    const gemsFromKills =
      enemyKillsThisTick * outputs.gemDropRate * (1 + state.luck * 0.3);
    state.gems += gemsFromKills;
    state.playerXP +=
      enemyKillsThisTick * 10 * outputs.xpMultiplier * outputs.gemValueMultiplier;

    // Level up
    const xpForLevel = state.playerLevel * 100;
    if (state.playerXP >= xpForLevel) {
      state.playerXP -= xpForLevel;
      state.playerLevel++;
      state.playerMaxHP += 5;
      state.playerHP = Math.min(state.playerMaxHP, state.playerHP + 10);
    }

    // Enemy damage to player
    const damageToPlayer =
      state.enemies *
      0.05 *
      outputs.enemyDamage *
      outputs.enemySpeed *
      (1 + outputs.aggression * 0.3);
    state.playerHP -= damageToPlayer;

    // Small regen
    state.playerHP = Math.min(state.playerMaxHP, state.playerHP + 0.02);

    // Record history
    if (tick % 60 === 0) {
      state.hpHistory.push((state.playerHP / state.playerMaxHP) * 100);
      state.stressHistory.push(stress);
    }

    // Check death
    if (state.playerHP <= 0) {
      survived = false;
    }
  }

  // Calculate fitness
  const survivalTime = state.tick / 60;
  const avgHP =
    state.hpHistory.length > 0
      ? state.hpHistory.reduce((a, b) => a + b, 0) / state.hpHistory.length
      : 50;

  const hpVariance =
    state.hpHistory.length > 1
      ? state.hpHistory.reduce((sum, hp) => sum + Math.pow(hp - avgHP, 2), 0) /
        state.hpHistory.length
      : 0;

  const hpDeviation = Math.abs(avgHP - GAME_CONFIG.IDEAL_HP);
  const flowScore = Math.max(0, 100 - hpDeviation * 2);

  const varianceBonus = Math.min(30, Math.sqrt(hpVariance) * 2);
  const survivalBonus = survivalTime * 2;
  const killEfficiency = state.kills / Math.max(1, survivalTime);
  const killBonus = Math.min(50, killEfficiency * 5);
  const pnlBonus = state.pnl < -0.1 && survivalTime > 60 ? 20 : 0;

  const fitness = flowScore + varianceBonus + survivalBonus + killBonus + pnlBonus;

  return {
    fitness,
    survivalTime,
    avgHP,
    hpVariance,
    kills: state.kills,
    finalPnL: state.pnl,
  };
}

// ============================================================================
// GENETIC ALGORITHM
// ============================================================================

interface Genome {
  brain: NeuralNetwork;
  fitness: number;
}

function createGenome(): Genome {
  return {
    brain: new Architect.Perceptron(16, 22, 13),
    fitness: 0,
  };
}

function crossover(a: Genome, b: Genome): Genome {
  const jsonA = a.brain.toJSON();
  const jsonB = b.brain.toJSON();

  const better = a.fitness > b.fitness ? jsonA : jsonB;
  const child = NetworkLib.fromJSON(better);

  return { brain: child, fitness: 0 };
}

function mutate(genome: Genome): Genome {
  const json = genome.brain.toJSON();
  return { brain: NetworkLib.fromJSON(json), fitness: 0 };
}

// ============================================================================
// MAIN TRAINING LOOP
// ============================================================================

async function train() {
  console.log('🧠 GameMaster Brain Training [V2 - Flow Optimized]');
  console.log(`   Population: ${CONFIG.POPULATION_SIZE}`);
  console.log(`   Generations: ${CONFIG.GENERATIONS}`);
  console.log(`   Architecture: 16-22-13`);
  console.log(`   Goal: Risk/Reward Balance & Momentum Awareness\n`);

  let population: Genome[] = [];
  for (let i = 0; i < CONFIG.POPULATION_SIZE; i++) {
    population.push(createGenome());
  }

  let bestEver: Genome | null = null;

  for (let gen = 1; gen <= CONFIG.GENERATIONS; gen++) {
    for (const genome of population) {
      let totalFitness = 0;
      const testScenarios = SCENARIOS.sort(() => Math.random() - 0.5).slice(0, 2);
      const testLeverages = [5, 25];

      for (const scenario of testScenarios) {
        for (const leverage of testLeverages) {
          const result = simulateGame(genome.brain, scenario, leverage);
          totalFitness += result.fitness;
        }
      }

      genome.fitness = totalFitness / (testScenarios.length * testLeverages.length);
    }

    population.sort((a, b) => b.fitness - a.fitness);
    const best = population[0];

    if (!bestEver || best.fitness > bestEver.fitness) {
      bestEver = {
        brain: NetworkLib.fromJSON(best.brain.toJSON()),
        fitness: best.fitness,
      };
    }

    const avgFitness =
      population.reduce((s, g) => s + g.fitness, 0) / population.length;

    console.log(
      `Gen ${gen}/${CONFIG.GENERATIONS} | Best: ${best.fitness.toFixed(1)} | Avg: ${avgFitness.toFixed(1)}`
    );

    if (gen % 20 === 0 || gen === CONFIG.GENERATIONS) {
      const brainDir = path.join(__dirname, '../../services/difficulty/brain');
      if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });

      const filename =
        gen === CONFIG.GENERATIONS ? 'gamemaster-FINAL.json' : `gamemaster-${gen}.json`;
      fs.writeFileSync(
        path.join(brainDir, filename),
        JSON.stringify({ brain: best.brain.toJSON() }, null, 2)
      );
      console.log(`   💾 Saved: ${filename}`);
    }

    if (gen < CONFIG.GENERATIONS) {
      const eliteCount = Math.floor(CONFIG.POPULATION_SIZE * CONFIG.ELITE_PERCENT);
      const elite = population.slice(0, eliteCount);
      const nextGen: Genome[] = [...elite];

      while (nextGen.length < CONFIG.POPULATION_SIZE) {
        const parentA = elite[Math.floor(Math.random() * elite.length)];
        const parentB = elite[Math.floor(Math.random() * elite.length)];

        let child: Genome;
        if (Math.random() < CONFIG.CROSSOVER_RATE) {
          child = crossover(parentA, parentB);
        } else {
          child = mutate(parentA);
        }

        if (Math.random() < CONFIG.MUTATION_RATE) {
          child = mutate(child);
        }

        nextGen.push(child);
      }
      population = nextGen;
    }
  }

  console.log('\n🎉 Training Complete!');
  console.log('   Brain saved to: services/difficulty/brain/gamemaster-FINAL.json');
}

train().catch(console.error);
