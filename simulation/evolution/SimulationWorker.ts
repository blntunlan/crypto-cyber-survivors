import { parentPort, workerData } from 'worker_threads';
import { HeadlessGameEngine } from '../headless-engine/HeadlessGameEngine.ts';
import { Network } from 'synaptic';
import { Fitness } from './Fitness.ts';

const SIMULATION_DURATION_SECONDS = 60; // Max duration per genome
const DT = 1 / 60; // 60 FPS physics

async function runSimulation() {
  if (!parentPort || !workerData) return;

  try {
    const genomeJson = workerData;

    // 1. Reconstruct Brain
    const brain = Network.fromJSON(genomeJson.network);

    // 2. Setup Engine
    const engine = new HeadlessGameEngine();

    // Apply difficulty genes (optional, if engine supports param overrides)
    // engine.setDifficultyParams(genomeJson.difficulty);

    let elapsedTime = 0;
    let surviving = true;

    // 3. Simulation Loop
    while (elapsedTime < SIMULATION_DURATION_SECONDS && surviving) {
      // A. Get Environment Inputs
      const inputs = engine.getInputs();

      // B. Neural Network Activation
      const outputs = brain.activate(inputs);

      // C. Apply Actions
      // Output 0: Move X (-1 to 1)
      // Output 1: Move Y (-1 to 1)
      const moveX = outputs[0] * 2 - 1;
      const moveY = outputs[1] * 2 - 1;

      // Output 2: Dash (Threshold > 0.8)
      // if (outputs[2] > 0.8) engine.dash();

      engine.updatePlayerInput(moveX, moveY);

      // D. Physics Step
      engine.step(DT);

      // E. Check Survival
      if (engine.isGameOver()) {
        surviving = false;
      }

      // F. Send Snapshot for Visualization (Throttle: every 10 frames)
      // Only send if this is the "watched" worker (optimization)
      // For now, we send randomly or if specifically requested.
      // To avoid flooding, we rely on Trainer to pick ONE worker to listen to via a separate channel,
      // but Worker implementation here is generic.
      // Simplified: All workers don't send snapshots unless asked.
      // But Trainer.ts currently doesn't differentiation.
      // Let's send updates via special message type if needed.

      elapsedTime += DT;
    }

    // 4. Calculate Fitness
    const stats = engine.getStats(); // { survivalTime, kills, exp, etc. }
    const fitness = Fitness.calculate({
      survivalTime: surviving ? SIMULATION_DURATION_SECONDS : elapsedTime,
      kills: stats.kills,
      level: stats.level,
      damageDealt: stats.totalDamageDealt,
      gemsCollected: stats.gemsCollected || 0,
    });

    // 5. Return Result
    parentPort.postMessage({ fitness });
  } catch (error) {
    console.error('Simulation Crash:', error);
    parentPort.postMessage({ fitness: 0 });
  }
}

void runSimulation();
