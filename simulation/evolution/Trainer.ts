/**
 * Trainer.ts - Project Darwin Orchestrator
 */
/* eslint-disable no-console */

import { Worker } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs';
import { Genome } from './Genome';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';

// ESM dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const POPULATION_SIZE = 50;
const GENERATIONS = 50;
const WORKER_COUNT = 4;

class DarwinTrainer {
  private population: Genome[] = [];
  // @ts-expect-error - generation is used in logging context or future stats
  private generation = 1;
  private bestGenome: Genome | null = null;
  private wss: WebSocketServer | null = null;

  constructor(enableWatchFrom: boolean) {
    if (enableWatchFrom) {
      this.setupWebSocket();
    }
  }

  private setupWebSocket() {
    this.wss = new WebSocketServer({ port: 8080 });
    console.log('👁️ Visual Inspector listening on ws://localhost:8080');

    this.wss.on('connection', _ws => console.log('Client connected'));
  }

  public async start() {
    console.log(`🧬 Project Darwin Initialized (TSX Mode)`);
    console.log(`   Population: ${POPULATION_SIZE}`);
    console.log(`   Generations: ${GENERATIONS}`);

    // 1. Initialize
    for (let i = 0; i < POPULATION_SIZE; i++) {
      this.population.push(new Genome());
    }

    // 2. Loop
    for (let gen = 1; gen <= GENERATIONS; gen++) {
      this.generation = gen;
      console.log(`\n🌊 Generation ${gen} / ${GENERATIONS} started...`);

      const startTime = Date.now();
      await this.evaluatePopulation();
      const duration = Date.now() - startTime;

      this.population.sort((a, b) => b.fitness - a.fitness);
      const best = this.population[0];
      this.bestGenome = best ?? null;

      if (best) {
        console.log(
          `   🏆 Best Fitness: ${best.fitness.toFixed(0)} (Time: ${duration}ms)`
        );

        if (this.wss) {
          const payload = JSON.stringify({
            type: 'GENERATION_UPDATE',
            generation: gen,
            bestFitness: best.fitness,
            bestGenome: best.toJSON(),
          });
          this.wss.clients.forEach(c => c.send(payload));
        }
      }

      if (gen % 10 === 0) this.saveCheckpoint(gen);
      if (gen < GENERATIONS) this.evolveNextGeneration();
    }

    console.log(`\n🎉 Training Complete!`);
    this.saveCheckpoint('FINAL');
    process.exit(0);
  }

  private async evaluatePopulation() {
    console.log(`   Simulating...`);
    const pool = [...this.population];
    while (pool.length > 0) {
      const batch = pool.splice(0, WORKER_COUNT);
      const promises = batch.map(genome => this.runWorker(genome));
      await Promise.all(promises);
    }
  }

  private runWorker(genome: Genome): Promise<void> {
    return new Promise(resolve => {
      const workerScript = path.join(__dirname, 'SimulationWorker.ts');
      const worker = new Worker(workerScript, {
        workerData: genome.toJSON(),
        execArgv: ['--import', 'tsx'],
      });

      worker.on('message', (msg: Record<string, unknown>) => {
        if (msg.type === 'SNAPSHOT') {
          // Forward to WebSocket
          if (this.wss) {
            const payload = JSON.stringify({
              type: 'SIM_UPDATE',
              snapshot: msg.snapshot,
            });
            // Broadcast to all viewers
            this.wss.clients.forEach(c => c.send(payload));
          }
        } else if (typeof msg.fitness === 'number') {
          genome.fitness = msg.fitness;
          resolve();
        }
      });

      worker.on('error', err => {
        console.error('Worker error:', err);
        genome.fitness = 0;
        resolve();
      });

      worker.on('exit', () => resolve());
    });
  }

  private evolveNextGeneration() {
    const survivorsCount = Math.floor(POPULATION_SIZE * 0.1);
    const survivors = this.population.slice(0, survivorsCount);

    const nextGen: Genome[] = [...survivors];

    while (nextGen.length < POPULATION_SIZE) {
      const parent = survivors[Math.floor(Math.random() * survivors.length)];
      if (parent) {
        // Crossover returns a new Genome
        const child = Genome.crossover(parent, parent);
        nextGen.push(child);
      } else {
        // Fallback if parent is somehow undefined
        nextGen.push(new Genome());
      }
    }
    this.population = nextGen;
  }

  private saveCheckpoint(suffix: string | number) {
    if (!this.bestGenome) return;
    const dir = path.join(__dirname, '../../services/difficulty/brain');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `brain-${suffix}.json`);
    fs.writeFileSync(filePath, JSON.stringify(this.bestGenome.toJSON(), null, 2));
  }
}

// Parse Args
const args = process.argv;
console.log('DEBUG ARGS:', args);
// Check for --watch flag
const watchMode = args.includes('--watch');
const trainer = new DarwinTrainer(watchMode);
void trainer.start();
