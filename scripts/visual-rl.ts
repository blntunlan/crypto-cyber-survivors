// Math utils
const dist = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
const angle = (x1: number, y1: number, x2: number, y2: number) =>
  Math.atan2(y2 - y1, x2 - x1);

// CONFIG
const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  FPS: 60,
  SIMULATION_SECONDS: 30, // 30 seconds per generation
  POPULATION_SIZE: 100, // More agents for better visual
  MUTATION_RATE: 0.1,

  PLAYER_SPEED: 150,
  DASH_MULTIPLIER: 3,
  DASH_DURATION: 0.2,
  DASH_COOLDOWN: 2.0,

  ENEMY_SPEED: 100,
  ENEMY_DAMAGE: 20,
  PLAYER_MAX_HP: 100,

  BUFF_HEAL: 30,
};

// NN Class
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
    const hidden = new Array(8).fill(0);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 6; j++) {
        hidden[i] += inputs[j] * this.w1[j][i];
      }
      hidden[i] = Math.tanh(hidden[i]);
    }

    const outputs = new Array(3).fill(0);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 8; j++) {
        outputs[i] += hidden[j] * this.w2[j][i];
      }
      outputs[i] = Math.tanh(outputs[i]);
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

interface Vector2 {
  x: number;
  y: number;
}

class Agent {
  x: number = CONFIG.WIDTH / 2;
  y: number = CONFIG.HEIGHT / 2;
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

    this.fitness += dt;

    if (this.dashTimer > 0) this.dashTimer -= dt;
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;

    const distE = closestEnemy
      ? dist(this.x, this.y, closestEnemy.x, closestEnemy.y) /
        Math.max(CONFIG.WIDTH, CONFIG.HEIGHT)
      : 1;
    const angE = closestEnemy
      ? angle(this.x, this.y, closestEnemy.x, closestEnemy.y) / Math.PI
      : 0;
    const distB = closestBuff
      ? dist(this.x, this.y, closestBuff.x, closestBuff.y) /
        Math.max(CONFIG.WIDTH, CONFIG.HEIGHT)
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

    const len = Math.sqrt(moveX * moveX + moveY * moveY) || 1;
    this.x += (moveX / len) * speed * dt;
    this.y += (moveY / len) * speed * dt;

    this.x = Math.max(0, Math.min(CONFIG.WIDTH, this.x));
    this.y = Math.max(0, Math.min(CONFIG.HEIGHT, this.y));
  }
}

class Simulation {
  agents: Agent[] = [];
  enemies: Vector2[] = [];
  buffs: Vector2[] = [];
  generation: number = 1;
  ticks: number = 0;

  speedMultiplier: number = 1;
  noRender: boolean = false;
  lastTime: number = 0;

  // DOM
  canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  ctx = this.canvas.getContext('2d')!;
  genLabel = document.getElementById('gen-value')!;
  aliveLabel = document.getElementById('alive-value')!;
  fitnessLabel = document.getElementById('fitness-value')!;
  timeLabel = document.getElementById('time-value')!;

  init() {
    for (let i = 0; i < CONFIG.POPULATION_SIZE; i++) {
      this.agents.push(new Agent());
    }

    // Bind UI
    document
      .getElementById('btn-speed-1')
      ?.addEventListener('click', e => this.setSpeed(1, e.target as HTMLElement));
    document
      .getElementById('btn-speed-5')
      ?.addEventListener('click', e => this.setSpeed(5, e.target as HTMLElement));
    document
      .getElementById('btn-speed-max')
      ?.addEventListener('click', e =>
        this.setSpeed(100, e.target as HTMLElement, true)
      );

    this.resetEnv();
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  setSpeed(speed: number, btn: HTMLElement, noRender: boolean = false) {
    this.speedMultiplier = speed;
    this.noRender = noRender;
    document
      .querySelectorAll('.controls button')
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  resetEnv() {
    this.enemies = [];
    this.buffs = [];
    this.ticks = 0;
    for (let i = 0; i < 5; i++) this.spawnEnemy();
    for (let i = 0; i < 3; i++) this.spawnBuff();
  }

  spawnEnemy() {
    // Spawn at edges
    const side = Math.floor(Math.random() * 4);
    let x = 0,
      y = 0;
    if (side === 0) {
      x = Math.random() * CONFIG.WIDTH;
      y = 0;
    }
    if (side === 1) {
      x = Math.random() * CONFIG.WIDTH;
      y = CONFIG.HEIGHT;
    }
    if (side === 2) {
      x = 0;
      y = Math.random() * CONFIG.HEIGHT;
    }
    if (side === 3) {
      x = CONFIG.WIDTH;
      y = Math.random() * CONFIG.HEIGHT;
    }
    this.enemies.push({ x, y });
  }

  spawnBuff() {
    this.buffs.push({
      x: 50 + Math.random() * (CONFIG.WIDTH - 100),
      y: 50 + Math.random() * (CONFIG.HEIGHT - 100),
    });
  }

  updateTick() {
    const dt = 1 / CONFIG.FPS;
    const maxTicks = CONFIG.SIMULATION_SECONDS * CONFIG.FPS;

    if (this.ticks >= maxTicks || this.agents.every(a => a.isDead)) {
      this.evaluateAndEvolve();
      return;
    }

    if (Math.random() < 0.03) this.spawnEnemy();
    if (Math.random() < 0.02) this.spawnBuff();

    for (let agent of this.agents) {
      if (agent.isDead) continue;

      let closestE: Vector2 | null = null;
      let minDistE = Infinity;
      for (let e of this.enemies) {
        const d = dist(agent.x, agent.y, e.x, e.y);
        if (d < minDistE) {
          minDistE = d;
          closestE = e;
        }
      }

      let closestB: Vector2 | null = null;
      let minDistB = Infinity;
      for (let b of this.buffs) {
        const d = dist(agent.x, agent.y, b.x, b.y);
        if (d < minDistB) {
          minDistB = d;
          closestB = b;
        }
      }

      agent.update(dt, closestE, closestB);

      for (let i = this.buffs.length - 1; i >= 0; i--) {
        const b = this.buffs[i];
        if (dist(agent.x, agent.y, b.x, b.y) < 20) {
          agent.hp = Math.min(CONFIG.PLAYER_MAX_HP, agent.hp + CONFIG.BUFF_HEAL);
          agent.fitness += 20;
          this.buffs.splice(i, 1);
        }
      }

      if (agent.dashTimer <= 0) {
        for (let e of this.enemies) {
          if (dist(agent.x, agent.y, e.x, e.y) < 15) {
            agent.hp -= CONFIG.ENEMY_DAMAGE * dt;
            if (agent.hp <= 0) {
              agent.isDead = true;
              agent.fitness -= 10;
              break;
            }
          }
        }
      }
    }

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
        e.x += Math.cos(a) * CONFIG.ENEMY_SPEED * dt;
        e.y += Math.sin(a) * CONFIG.ENEMY_SPEED * dt;
      }
    }

    this.ticks++;
  }

  evaluateAndEvolve() {
    this.agents.sort((a, b) => b.fitness - a.fitness);

    // Update best fitness UI
    const bestFitness = this.agents[0].fitness.toFixed(1);
    this.fitnessLabel.innerText = bestFitness;

    const survivors = this.agents.slice(0, Math.floor(CONFIG.POPULATION_SIZE * 0.2));
    const nextGen: Agent[] = [];

    survivors.forEach(s => nextGen.push(new Agent(s.brain)));

    while (nextGen.length < CONFIG.POPULATION_SIZE) {
      const parent = survivors[Math.floor(Math.random() * survivors.length)];
      nextGen.push(new Agent(parent.brain.mutate()));
    }

    this.agents = nextGen;
    this.generation++;
    this.genLabel.innerText = this.generation.toString();

    this.agents.forEach(a => {
      a.x = CONFIG.WIDTH / 2;
      a.y = CONFIG.HEIGHT / 2;
      a.hp = CONFIG.PLAYER_MAX_HP;
      a.dashTimer = 0;
      a.dashCooldownTimer = 0;
      a.fitness = 0;
      a.isDead = false;
    });

    this.resetEnv();
  }

  draw() {
    this.ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // Buffs
    this.ctx.fillStyle = '#10b981'; // Emerald
    for (let b of this.buffs) {
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Enemies
    this.ctx.fillStyle = '#ef4444'; // Red
    for (let e of this.enemies) {
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Agents
    let aliveCount = 0;
    for (let a of this.agents) {
      if (a.isDead) continue;
      aliveCount++;

      this.ctx.beginPath();
      this.ctx.arc(a.x, a.y, 8, 0, Math.PI * 2);

      // Color logic
      if (a.dashTimer > 0) {
        this.ctx.fillStyle = '#a855f7'; // Purple when dashing
      } else {
        // Fade to red as HP drops
        const hpPercent = Math.max(0, a.hp / CONFIG.PLAYER_MAX_HP);
        const r = Math.floor(255 * (1 - hpPercent));
        const b = Math.floor(255 * hpPercent);
        this.ctx.fillStyle = `rgb(${r}, 100, ${b})`;
      }
      this.ctx.fill();

      // Draw HP bar
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(a.x - 10, a.y - 15, 20, 3);
      this.ctx.fillStyle = a.hp > 30 ? '#10b981' : '#ef4444';
      this.ctx.fillRect(a.x - 10, a.y - 15, 20 * (a.hp / CONFIG.PLAYER_MAX_HP), 3);
    }

    // UI Updates
    this.aliveLabel.innerText = `${aliveCount}/${CONFIG.POPULATION_SIZE}`;
    const timeLeft = Math.max(0, CONFIG.SIMULATION_SECONDS - this.ticks / CONFIG.FPS);
    this.timeLabel.innerText = `${timeLeft.toFixed(1)}s`;
  }

  loop(currentTime: number) {
    if (this.noRender) {
      // Ultra training: run 100 ticks per frame without rendering
      for (let i = 0; i < 100; i++) this.updateTick();

      // Just update UI texts occasionally
      if (this.ticks % 60 === 0) {
        const aliveCount = this.agents.filter(a => !a.isDead).length;
        this.aliveLabel.innerText = `${aliveCount}/${CONFIG.POPULATION_SIZE}`;
        this.timeLabel.innerText = `Training...`;
      }
    } else {
      // Normal/Fast speed
      for (let i = 0; i < this.speedMultiplier; i++) {
        this.updateTick();
      }
      this.draw();
    }

    requestAnimationFrame(this.loop.bind(this));
  }
}

// Start
window.onload = () => {
  const sim = new Simulation();
  sim.init();
};
