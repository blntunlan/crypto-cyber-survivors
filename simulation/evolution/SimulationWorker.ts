import { parentPort, workerData } from 'worker_threads';
import { HeadlessGameEngine } from '../headless-engine/HeadlessGameEngine.ts';
import {
  createMarketSimulator,
  type MarketSimulator,
} from '../data/MarketSimulator.ts';
import * as synaptic from 'synaptic';
import { Fitness } from './Fitness.ts';

// ESM/CJS compatibility
const SynapticModule = synaptic as Record<string, unknown>;
const SynapticDefault = SynapticModule.default as Record<string, unknown> | undefined;
const NetworkLib = SynapticModule.Network ?? SynapticDefault?.Network;

const SIMULATION_DURATION_SECONDS = 60; // Max duration per genome
const DT = 1 / 60; // 60 FPS physics

async function runSimulation() {
  if (!parentPort || !workerData) return;

  try {
    const genomeJson = workerData;

    // 1. Reconstruct Brain
    const brain = NetworkLib.fromJSON(genomeJson.brain);

    // 2. Setup Engine and Market Simulator
    const engine = new HeadlessGameEngine();
    const marketSim: MarketSimulator = createMarketSimulator();

    // Initialize with random scenario for training variety
    const scenario = marketSim.initRandomScenario();

    // Apply difficulty genes if present
    if (genomeJson.difficulty) {
      engine.spawnRateMultiplier = genomeJson.difficulty.spawnLimitMax ?? 1.0;
      engine.enemySpeedMultiplier = genomeJson.difficulty.speedLimitMax ?? 1.0;
      engine.enemyHpMultiplier = genomeJson.difficulty.hpScaler ?? 1.0;
    }

    let elapsedTime = 0;
    let surviving = true;

    // 3. Simulation Loop with Market Integration
    while (elapsedTime < SIMULATION_DURATION_SECONDS && surviving) {
      // A. Update Market State
      const marketState = marketSim.step(DT);
      engine.updateMarketState({
        rsi: marketState.rsi,
        atrPercent: marketState.atrPercent,
        normalizedVolume: marketState.normalizedVolume,
        trend: marketState.trend,
      });

      // B. Get Environment Inputs (now includes market data)
      const inputs = engine.getInputs();

      // C. Neural Network Activation
      const outputs = brain.activate(inputs);

      // D. Apply Actions
      // Output 0: Move X (-1 to 1)
      // Output 1: Move Y (-1 to 1)
      const moveX = outputs[0] * 2 - 1;
      const moveY = outputs[1] * 2 - 1;

      // Output 2: Reserved for dash/special action
      // if (outputs[2] > 0.8) engine.dash();

      engine.updatePlayerInput(moveX, moveY);

      // E. Physics Step
      engine.step(DT);

      // F. Check Survival
      if (engine.isGameOver()) {
        surviving = false;
      }

      elapsedTime += DT;
    }

    // 4. Calculate Market-Aware Fitness
    const stats = engine.getStats();
    const fitness = Fitness.calculate({
      survivalTime: stats.survivalTime,
      kills: stats.kills,
      level: stats.level,
      damageDealt: stats.totalDamageDealt,
      gemsCollected: stats.gemsCollected,
      // Market-aware stats
      killsInBullMarket: stats.killsInBullMarket,
      killsInBearMarket: stats.killsInBearMarket,
      survivalInHighVolatility: stats.survivalInHighVolatility,
      whaleEncounters: stats.whaleEncounters,
    });

    // 5. Return Result with scenario info
    parentPort.postMessage({
      fitness,
      scenario: scenario.name,
      stats: {
        survivalTime: stats.survivalTime,
        kills: stats.kills,
        level: stats.level,
        bearKills: stats.killsInBearMarket,
        bullKills: stats.killsInBullMarket,
      },
    });
  } catch (error) {
    console.error('Simulation Crash:', error);
    parentPort.postMessage({ fitness: 0 });
  }
}

void runSimulation();
