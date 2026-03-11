import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// --- CONFIGURATION ---
const CONFIG = {
  ARENA_SIZE: 800,
  FPS: 30, // Ticks per second
  SIMULATION_SECONDS: 60, // Max 60 seconds per generation
  POPULATION_SIZE: 50,
  MUTATION_RATE: 0.1,

  PLAYER_SPEED: 150, // pixels per second
  DASH_MULTIPLIER: 3,
  DASH_DURATION: 0.2, // seconds
  DASH_COOLDOWN: 2.0, // seconds

  ENEMY_SPEED: 100,
  ENEMY_DAMAGE: 10,
  PLAYER_MAX_HP: 100,

  BUFF_HEAL: 20,
};

// --- MATH UTILS ---
const dist = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
const angle = (x1: number, y1: number, x2: number, y2: number) =>
  Math.atan2(y2 - y1, x2 - x1);

// --- SIMPLE NEURAL NETWORK (MLP) ---
// Inputs: 6 (Dist to enemy, Angle to enemy, Dist to buff, Angle to buff, HP, Dash Ready)
// Hidden: 8
// Outputs: 3 (MoveX, MoveY, Dash Intent)
class NeuralNetwork {
  w1: number[][]; // 6x8
  w2: number[][]; // 8x3

  constructor(w1?: number[][], w2?: number[][]) {
    this.w1 =
      w1 ||
      Array.from({ length: 6 }, () =>
        Array.from({ length: 8 }, () => Math.random() * 2 - 1)
      );
    this.w2 =
      w2 ||
      Array.from({ length: 8 }, () =>
        Array.from({ length: 3 }, () => Math.random() * 2 - 1)
      );
  }

  forward(inputs: number[]): number[] {
    // Hidden layer
    const hidden = new Array(8).fill(0);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 6; j++) {
        hidden[i] += inputs[j] * this.w1[j][i];
      }
      hidden[i] = Math.tanh(hidden[i]); // Activation
    }

    // Output layer
    const outputs = new Array(3).fill(0);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 8; j++) {
        outputs[i] += hidden[j] * this.w2[j][i];
      }
      outputs[i] = Math.tanh(outputs[i]); // -1 to 1
    }
    return outputs;
  }

  mutate(): NeuralNetwork {
    const newW1 = this.w1.map(row =>
      row.map(w =>
        Math.random() < CONFIG.MUTATION_RATE ? w + (Math.random() * 0.5 - 0.25) : w
      )
    );
    const newW2 = this.w2.map(row =>
      row.map(w =>
        Math.random() < CONFIG.MUTATION_RATE ? w + (Math.random() * 0.5 - 0.25) : w
      )
    );
    return new NeuralNetwork(newW1, newW2);
  }
}

// --- GAME ENTITIES ---
interface Vector2 {
  x: number;
  y: number;
}

class Agent {
  x: number = CONFIG.ARENA_SIZE / 2;
  y: number = CONFIG.ARENA_SIZE / 2;
  hp: number = CONFIG.PLAYER_MAX_HP;
  dashTimer: number = 0;
  dashCooldownTimer: number = 0;
  fitness: number = 0;
  isDead: boolean = false;
  brain: NeuralNetwork;

  constructor(brain?: NeuralNetwork) {
    this.brain = brain || new NeuralNetwork();
  }

  update(dt: number, closestEnemy: Vector2 | null, closestBuff: Vector2 | null) {
    if (this.isDead) return;

    this.fitness += dt; // Reward for surviving

    // Cooldowns
    if (this.dashTimer > 0) this.dashTimer -= dt;
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;

    // Brain Inputs
    const distE = closestEnemy
      ? dist(this.x, this.y, closestEnemy.x, closestEnemy.y) / CONFIG.ARENA_SIZE
      : 1;
    const angE = closestEnemy
      ? angle(this.x, this.y, closestEnemy.x, closestEnemy.y) / Math.PI
      : 0;
    const distB = closestBuff
      ? dist(this.x, this.y, closestBuff.x, closestBuff.y) / CONFIG.ARENA_SIZE
      : 1;
    const angB = closestBuff
      ? angle(this.x, this.y, closestBuff.x, closestBuff.y) / Math.PI
      : 0;
    const hpNorm = this.hp / CONFIG.PLAYER_MAX_HP;
    const dashReady = this.dashCooldownTimer <= 0 ? 1 : 0;

    const inputs = [distE, angE, distB, angB, hpNorm, dashReady];
    const outputs = this.brain.forward(inputs);

    const moveX = outputs[0];
    const moveY = outputs[1];
    const wantDash = outputs[2] > 0.5;

    if (wantDash && this.dashCooldownTimer <= 0) {
      this.dashTimer = CONFIG.DASH_DURATION;
      this.dashCooldownTimer = CONFIG.DASH_COOLDOWN;
    }

    const speed =
      this.dashTimer > 0
        ? CONFIG.PLAYER_SPEED * CONFIG.DASH_MULTIPLIER
        : CONFIG.PLAYER_SPEED;

    // Normalize movement
    const len = Math.sqrt(moveX * moveX + moveY * moveY) || 1;
    this.x += (moveX / len) * speed * dt;
    this.y += (moveY / len) * speed * dt;

    // Bounds
    this.x = Math.max(0, Math.min(CONFIG.ARENA_SIZE, this.x));
    this.y = Math.max(0, Math.min(CONFIG.ARENA_SIZE, this.y));
  }
}

// --- ENVIRONMENT SIMULATION ---
class Simulation {
  agents: Agent[] = [];
  enemies: Vector2[] = [];
  buffs: Vector2[] = [];
  generation: number = 1;
  marketVolatility: number = 1.0;

  async init() {
    console.log('Fetching market data from Supabase to set volatility...');
    if (supabase) {
      const { data, error } = await supabase
        .from('price_logs')
        .select('price')
        .eq('pair', 'BTC')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 10) {
        // Calculate basic volatility
        const prices = data.map(d => d.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = (max - min) / min; // e.g., 0.05 is 5% change
        this.marketVolatility = 1.0 + range * 10; // Scale up impact
        console.log(
          `[Market] Real Market Volatility multiplier calculated: ${this.marketVolatility.toFixed(2)}x`
        );
      } else {
        console.log('[Market] No recent data found, using baseline volatility 1.0x');
      }
    } else {
      console.log(
        '[Market] Supabase not connected. Using synthetic baseline volatility 1.0x'
      );
    }

    for (let i = 0; i < CONFIG.POPULATION_SIZE; i++) {
      this.agents.push(new Agent());
    }
    this.runGeneration();
  }

  resetEnv() {
    this.enemies = [];
    this.buffs = [];
    // Spawn initial entities
    for (let i = 0; i < 5; i++) this.spawnEnemy();
    for (let i = 0; i < 3; i++) this.spawnBuff();
  }

  spawnEnemy() {
    this.enemies.push({
      x: Math.random() * CONFIG.ARENA_SIZE,
      y: Math.random() * CONFIG.ARENA_SIZE,
    });
  }

  spawnBuff() {
    this.buffs.push({
      x: Math.random() * CONFIG.ARENA_SIZE,
      y: Math.random() * CONFIG.ARENA_SIZE,
    });
  }

  runGeneration() {
    console.log(`\n--- Starting Generation ${this.generation} ---`);
    this.resetEnv();
    this.agents.forEach(a => {
      a.x = CONFIG.ARENA_SIZE / 2;
      a.y = CONFIG.ARENA_SIZE / 2;
      a.hp = CONFIG.PLAYER_MAX_HP;
      a.dashTimer = 0;
      a.dashCooldownTimer = 0;
      a.fitness = 0;
      a.isDead = false;
    });

    let ticks = 0;
    const maxTicks = CONFIG.SIMULATION_SECONDS * CONFIG.FPS;
    const dt = 1 / CONFIG.FPS;
    let aliveCount = CONFIG.POPULATION_SIZE;

    while (ticks < maxTicks && aliveCount > 0) {
      // Spawn enemies over time based on volatility
      if (Math.random() < 0.02 * this.marketVolatility) {
        this.spawnEnemy();
      }

      // Spawn buffs occasionally
      if (Math.random() < 0.01) {
        this.spawnBuff();
      }

      aliveCount = 0;

      for (let agent of this.agents) {
        if (agent.isDead) continue;
        aliveCount++;

        // Find closest enemy
        let closestE: Vector2 | null = null;
        let minDistE = Infinity;
        for (let e of this.enemies) {
          const d = dist(agent.x, agent.y, e.x, e.y);
          if (d < minDistE) {
            minDistE = d;
            closestE = e;
          }
        }

        // Find closest buff
        let closestB: Vector2 | null = null;
        let minDistB = Infinity;
        for (let b of this.buffs) {
          const d = dist(agent.x, agent.y, b.x, b.y);
          if (d < minDistB) {
            minDistB = d;
            closestB = b;
          }
        }

        // Agent Action
        agent.update(dt, closestE, closestB);

        // Check buff collection
        for (let i = this.buffs.length - 1; i >= 0; i--) {
          const b = this.buffs[i];
          if (dist(agent.x, agent.y, b.x, b.y) < 20) {
            agent.hp = Math.min(CONFIG.PLAYER_MAX_HP, agent.hp + CONFIG.BUFF_HEAL);
            agent.fitness += 20; // Big reward for getting buff
            this.buffs.splice(i, 1);
          }
        }

        // Check enemy collision & damage
        // If dashing, agent is immune (i-frames)
        if (agent.dashTimer <= 0) {
          for (let e of this.enemies) {
            if (dist(agent.x, agent.y, e.x, e.y) < 15) {
              agent.hp -= CONFIG.ENEMY_DAMAGE * dt * this.marketVolatility;
              if (agent.hp <= 0) {
                agent.isDead = true;
                agent.fitness -= 10; // Penalty for dying
                break;
              }
            }
          }
        }
      }

      // Move enemies towards the closest agent (swarming)
      for (let e of this.enemies) {
        let targetA: Agent | null = null;
        let minDA = Infinity;
        for (let a of this.agents) {
          if (a.isDead) continue;
          const d = dist(e.x, e.y, a.x, a.y);
          if (d < minDA) {
            minDA = d;
            targetA = a;
          }
        }

        if (targetA) {
          const a = angle(e.x, e.y, targetA.x, targetA.y);
          const speed = CONFIG.ENEMY_SPEED * this.marketVolatility;
          e.x += Math.cos(a) * speed * dt;
          e.y += Math.sin(a) * speed * dt;
        }
      }

      ticks++;
    }

    this.evaluateAndEvolve();
  }

  evaluateAndEvolve() {
    // Sort agents by fitness descending
    this.agents.sort((a, b) => b.fitness - a.fitness);

    const bestFitness = this.agents[0].fitness.toFixed(1);
    const avgFitness = (
      this.agents.reduce((sum, a) => sum + a.fitness, 0) / this.agents.length
    ).toFixed(1);

    console.log(
      `Gen ${this.generation} Results | Best Fitness: ${bestFitness} | Avg Fitness: ${avgFitness}`
    );

    // Stop after 20 generations to show the demo
    if (this.generation >= 20) {
      console.log('--- Training Complete ---');
      console.log(
        'Top Agent Brain Structure (w1):',
        this.agents[0].brain.w1[0].map(w => w.toFixed(2))
      );
      return;
    }

    // Elitism: Keep top 20%
    const survivors = this.agents.slice(0, Math.floor(CONFIG.POPULATION_SIZE * 0.2));

    const nextGen: Agent[] = [];

    // Copy survivors exactly
    survivors.forEach(s => nextGen.push(new Agent(s.brain)));

    // Fill the rest with mutations of survivors
    while (nextGen.length < CONFIG.POPULATION_SIZE) {
      const parent = survivors[Math.floor(Math.random() * survivors.length)];
      nextGen.push(new Agent(parent.brain.mutate()));
    }

    this.agents = nextGen;
    this.generation++;

    // Slight delay to prevent maxing out the stack event loop synchronously
    setTimeout(() => this.runGeneration(), 0);
  }
}

const sim = new Simulation();
sim.init();
