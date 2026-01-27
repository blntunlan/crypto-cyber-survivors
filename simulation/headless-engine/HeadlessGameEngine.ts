/**
 * HeadlessGameEngine (Self-Contained)
 *
 * Optimized for Node.js AI Training without project dependencies.
 * Removes complex service imports to fix ESM resolution issues.
 */

// --- Types ---
interface Entity {
  x: number;
  y: number;
  active: boolean;
  radius: number;
}
interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  type: string;
  baseDamage: number;
}
interface Bullet extends Entity {
  vx: number;
  vy: number;
  damage: number;
}
interface Gem extends Entity {
  value: number;
}

export class HeadlessGameEngine {
  // Config
  width = 1920;
  height = 1080;

  // State
  activeEnemies: Enemy[] = [];
  activeBullets: Bullet[] = [];
  activeGems: Gem[] = [];

  spawnTimer = 0;
  time = 0;

  // Player
  player = {
    x: 960,
    y: 540,
    vx: 0,
    vy: 0,
    radius: 16,
    hp: 100,
    maxHp: 100,
    speed: 300,
    baseDamage: 25,
    fireRate: 200,
    lastFireTime: 0,
    level: 1,
    exp: 0,
    nextLevelExp: 100,
    isDead: false,
    stats: { kills: 0, damageTaken: 0, totalDamageDealt: 0, gemsCollected: 0 },
  };

  constructor() {
    // Reset State
    this.activeEnemies = [];
    this.activeBullets = [];
    this.activeGems = [];
  }

  // --- AI Interface ---
  public updatePlayerInput(moveX: number, moveY: number) {
    const len = Math.hypot(moveX, moveY);
    if (len > 1) {
      moveX /= len;
      moveY /= len;
    }
    this.player.vx = moveX * this.player.speed;
    this.player.vy = moveY * this.player.speed;
  }

  public getInputs(): number[] {
    const inputs: number[] = [];
    const rays = 8;
    const maxDist = 500;

    // 1. Raycast
    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      let minDist = maxDist;

      for (const e of this.activeEnemies) {
        if (!e.active) continue;
        const ex = e.x - this.player.x;
        const ey = e.y - this.player.y;
        if (ex * dx + ey * dy > 0) {
          // Dot product check
          const dist = Math.hypot(ex, ey);
          if (dist < minDist) {
            // Simplified Angle Check
            const angleToEnemy = Math.atan2(ey, ex);
            const diff = Math.abs(angle - angleToEnemy);
            const normalizedDiff = Math.min(diff, Math.PI * 2 - diff);
            if (normalizedDiff < 0.5) minDist = dist;
          }
        }
      }
      inputs.push(minDist / maxDist);
    }

    // 2. Nearest Gem
    let nearestGemDist = maxDist;
     
    let gemX = 0,
      gemY = 0;
    for (const g of this.activeGems) {
      if (!g.active) continue;
      const dist = Math.hypot(g.x - this.player.x, g.y - this.player.y);
      if (dist < nearestGemDist) {
        nearestGemDist = dist;
        gemX = (g.x - this.player.x) / maxDist;
        gemY = (g.y - this.player.y) / maxDist;
      }
    }
    inputs.push(nearestGemDist < maxDist ? gemX : 0);
    inputs.push(nearestGemDist < maxDist ? gemY : 0);

    // 3. Stats
    inputs.push(this.player.hp / this.player.maxHp);
    inputs.push(this.player.exp / this.player.nextLevelExp);

    return inputs;
  }

  public getSnapshot() {
    return {
      player: { x: this.player.x, y: this.player.y, hp: this.player.hp },
      enemies: this.activeEnemies.filter(e => e.active).map(e => ({ x: e.x, y: e.y })),
      gems: this.activeGems.filter(g => g.active).map(g => ({ x: g.x, y: g.y })),
    };
  }

  public isGameOver() {
    return this.player.isDead;
  }
  public getStats() {
    return { ...this.player.stats, level: this.player.level };
  }

  // --- Update Loop ---
  public step(dt: number) {
    if (this.player.isDead) return;
    this.time += dt;

    // Player Move
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;
    this.player.x = Math.max(16, Math.min(this.width - 16, this.player.x));
    this.player.y = Math.max(16, Math.min(this.height - 16, this.player.y));

    // Auto Fire
    if (Date.now() - this.player.lastFireTime > this.player.fireRate) {
      this.fire();
      this.player.lastFireTime = Date.now();
    }

    // Spawn Logic
    this.spawnTimer += dt;
    if (this.spawnTimer > 1.0) {
      // Every 1 sec
      if (this.activeEnemies.length < 50) this.spawnEnemy();
      this.spawnTimer = 0;
    }

    // Update Enemies
    this.activeEnemies = this.activeEnemies.filter(e => e.active);
    for (const e of this.activeEnemies) {
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        e.x += (dx / dist) * e.speed * dt;
        e.y += (dy / dist) * e.speed * dt;
      }
    }

    // Collisions
    this.handleCollisions(dt);
  }

  private spawnEnemy() {
    // Simple spawn logic
    const edge = Math.floor(Math.random() * 4);
    let x = 0,
      y = 0;
    if (edge === 0) {
      x = Math.random() * this.width;
      y = -50;
    } else if (edge === 1) {
      x = Math.random() * this.width;
      y = this.height + 50;
    } else if (edge === 2) {
      x = -50;
      y = Math.random() * this.height;
    } else {
      x = this.width + 50;
      y = Math.random() * this.height;
    }

    this.activeEnemies.push({
      x,
      y,
      active: true,
      radius: 20,
      hp: 50,
      maxHp: 50,
      speed: 100 + this.player.level * 10,
      type: 'basic',
      baseDamage: 10,
    });
  }

  private fire() {
    // Find nearest enemy
    let target: Enemy | null = null;
    let minD = 600;
    for (const e of this.activeEnemies) {
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < minD) {
        minD = d;
        target = e;
      }
    }

    if (target) {
      const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
      this.activeBullets.push({
        x: this.player.x,
        y: this.player.y,
        active: true,
        radius: 5,
        vx: Math.cos(angle) * 800,
        vy: Math.sin(angle) * 800,
        damage: this.player.baseDamage,
      });
    }
  }

  private handleCollisions(dt: number) {
    // Bullets
    this.activeBullets = this.activeBullets.filter(b => b.active);
    for (const b of this.activeBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height) {
        b.active = false;
        continue;
      }

      for (const e of this.activeEnemies) {
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.radius) {
          e.hp -= b.damage;
          b.active = false;
          this.player.stats.totalDamageDealt += b.damage;
          if (e.hp <= 0) {
            e.active = false;
            this.player.stats.kills++;
            this.activeGems.push({
              x: e.x,
              y: e.y,
              active: true,
              radius: 8,
              value: 10,
            });
          }
          break;
        }
      }
    }

    // Player vs Enemy
    for (const e of this.activeEnemies) {
      if (
        Math.hypot(e.x - this.player.x, e.y - this.player.y) <
        e.radius + this.player.radius
      ) {
        this.player.hp -= 10;
        this.player.stats.damageTaken += 10;
        e.active = false; // Enemy dies on contact (suicide attack)
        if (this.player.hp <= 0) this.player.isDead = true;
      }
    }

    // Gems
    this.activeGems = this.activeGems.filter(g => g.active);
    for (const g of this.activeGems) {
      const dist = Math.hypot(g.x - this.player.x, g.y - this.player.y);
      if (dist < 150) {
        // Magnet
        g.x += (this.player.x - g.x) * 5 * dt;
        g.y += (this.player.y - g.y) * 5 * dt;
      }
      if (dist < 30) {
        g.active = false;
        this.player.exp += g.value;
        this.player.stats.gemsCollected++;
        if (this.player.exp >= this.player.nextLevelExp) {
          this.player.level++;
          this.player.exp = 0;
          this.player.nextLevelExp *= 1.5;
          this.player.hp = Math.min(this.player.hp + 20, this.player.maxHp);
        }
      }
    }
  }
}
