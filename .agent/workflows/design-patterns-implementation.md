---
description: Design Patterns Implementation Plan - Decorator, Builder, Flyweight, Chain of Responsibility
---

# 🎯 Design Patterns Implementation Plan

Bu döküman, Crypto Cyber Survivors projesine eklenecek 4 design pattern'in detaylı implementasyon planını içerir.

---

## 📁 Yeni Dosya Yapısı

```
services/
├── patterns/
│   ├── decorators/
│   │   ├── index.ts
│   │   ├── IPlayerStats.ts
│   │   ├── BaseDecorator.ts
│   │   ├── buffs/
│   │   │   ├── RageModeDecorator.ts
│   │   │   ├── DiamondHandsDecorator.ts
│   │   │   ├── BerserkDecorator.ts
│   │   │   └── index.ts
│   │   └── debuffs/
│   │       ├── SlowDecorator.ts
│   │       ├── VulnerableDecorator.ts
│   │       ├── LiquidatedDecorator.ts
│   │       └── index.ts
│   │
│   ├── builders/
│   │   ├── index.ts
│   │   ├── EnemyBuilder.ts
│   │   ├── CardBuilder.ts
│   │   └── directors/
│   │       ├── BossDirector.ts
│   │       └── WaveDirector.ts
│   │
│   ├── flyweight/
│   │   ├── index.ts
│   │   ├── ParticleFlyweightFactory.ts
│   │   └── types.ts
│   │
│   └── damage-pipeline/
│       ├── index.ts
│       ├── DamageContext.ts
│       ├── DamageHandler.ts
│       └── handlers/
│           ├── CriticalHitHandler.ts
│           ├── ArmorHandler.ts
│           ├── ComboMultiplierHandler.ts
│           ├── BuffHandler.ts
│           └── index.ts
```

---

## 1️⃣ Decorator Pattern - Buff/Debuff Sistemi

### 1.1 Amaç
- Oyuncu stat'larını dinamik olarak modifiye etme
- Stacklenebilir buff/debuff'lar
- Kart efektleri ile entegrasyon

### 1.2 Implementation Steps

#### Step 1: Interface Tanımla
```typescript
// services/patterns/decorators/IPlayerStats.ts
export interface IPlayerStats {
  getDamage(): number;
  getSpeed(): number;
  getFireRate(): number;
  getCritChance(): number;
  getCritDamage(): number;
  getArmor(): number;
  getMagnet(): number;
  getProjectiles(): number;
}
```

#### Step 2: Base Player Adapter
```typescript
// services/patterns/decorators/PlayerStatsAdapter.ts
import { type Player } from '../../types';
import { type IPlayerStats } from './IPlayerStats';

export class PlayerStatsAdapter implements IPlayerStats {
  constructor(private player: Player) {}

  getDamage(): number { return this.player.baseDamage; }
  getSpeed(): number { return this.player.speed; }
  getFireRate(): number { return this.player.fireRate; }
  getCritChance(): number { return this.player.critChance; }
  getCritDamage(): number { return this.player.critChance * 2; }
  getArmor(): number { return this.player.armor; }
  getMagnet(): number { return this.player.magnet; }
  getProjectiles(): number { return this.player.projectiles; }
}
```

#### Step 3: Base Decorator
```typescript
// services/patterns/decorators/BaseDecorator.ts
import { type IPlayerStats } from './IPlayerStats';

export abstract class StatDecorator implements IPlayerStats {
  constructor(protected wrapped: IPlayerStats) {}

  getDamage(): number { return this.wrapped.getDamage(); }
  getSpeed(): number { return this.wrapped.getSpeed(); }
  getFireRate(): number { return this.wrapped.getFireRate(); }
  getCritChance(): number { return this.wrapped.getCritChance(); }
  getCritDamage(): number { return this.wrapped.getCritDamage(); }
  getArmor(): number { return this.wrapped.getArmor(); }
  getMagnet(): number { return this.wrapped.getMagnet(); }
  getProjectiles(): number { return this.wrapped.getProjectiles(); }

  // Decorator bilgisi
  abstract getName(): string;
  abstract getDuration(): number; // ms, -1 = permanent
  abstract getIcon(): string;
}
```

#### Step 4: Concrete Buffs
```typescript
// services/patterns/decorators/buffs/RageModeDecorator.ts
import { StatDecorator } from '../BaseDecorator';

export class RageModeDecorator extends StatDecorator {
  private readonly DAMAGE_BONUS = 1.5;  // +50%
  private readonly SPEED_BONUS = 1.2;   // +20%

  getDamage(): number {
    return this.wrapped.getDamage() * this.DAMAGE_BONUS;
  }

  getSpeed(): number {
    return this.wrapped.getSpeed() * this.SPEED_BONUS;
  }

  getName(): string { return 'Rage Mode'; }
  getDuration(): number { return 10000; } // 10 seconds
  getIcon(): string { return '🔥'; }
}
```

```typescript
// services/patterns/decorators/buffs/DiamondHandsDecorator.ts
export class DiamondHandsDecorator extends StatDecorator {
  getArmor(): number {
    return this.wrapped.getArmor() + 5; // +5 flat armor
  }

  getCritChance(): number {
    return Math.min(1, this.wrapped.getCritChance() + 0.1); // +10%
  }

  getName(): string { return 'Diamond Hands'; }
  getDuration(): number { return -1; } // Permanent
  getIcon(): string { return '💎'; }
}
```

#### Step 5: Concrete Debuffs
```typescript
// services/patterns/decorators/debuffs/SlowDecorator.ts
export class SlowDecorator extends StatDecorator {
  constructor(wrapped: IPlayerStats, private slowPercent: number = 0.5) {
    super(wrapped);
  }

  getSpeed(): number {
    return this.wrapped.getSpeed() * this.slowPercent;
  }

  getName(): string { return 'Slowed'; }
  getDuration(): number { return 3000; }
  getIcon(): string { return '🐌'; }
}
```

#### Step 6: Buff Manager Service
```typescript
// services/patterns/decorators/BuffManager.ts
import { type IPlayerStats } from './IPlayerStats';
import { type StatDecorator } from './BaseDecorator';
import { PlayerStatsAdapter } from './PlayerStatsAdapter';
import { EventBus } from '../../EventBus';

interface ActiveBuff {
  decorator: StatDecorator;
  expiresAt: number; // timestamp, -1 = never
}

class BuffManagerClass {
  private static instance: BuffManagerClass | null = null;
  private activeBuffs: ActiveBuff[] = [];
  private baseStats: IPlayerStats | null = null;

  static getInstance(): BuffManagerClass {
    return (BuffManagerClass.instance ??= new BuffManagerClass());
  }

  initialize(player: Player): void {
    this.baseStats = new PlayerStatsAdapter(player);
    this.activeBuffs = [];
  }

  addBuff(DecoratorClass: new (wrapped: IPlayerStats) => StatDecorator): void {
    const current = this.getDecoratedStats();
    const decorator = new DecoratorClass(current);
    const duration = decorator.getDuration();

    this.activeBuffs.push({
      decorator,
      expiresAt: duration === -1 ? -1 : Date.now() + duration,
    });

    EventBus.emit('buffApplied', {
      name: decorator.getName(),
      icon: decorator.getIcon(),
      duration,
    });
  }

  removeBuff(name: string): void {
    this.activeBuffs = this.activeBuffs.filter(
      b => b.decorator.getName() !== name
    );
  }

  update(): void {
    const now = Date.now();
    const expired = this.activeBuffs.filter(
      b => b.expiresAt !== -1 && b.expiresAt <= now
    );

    for (const buff of expired) {
      EventBus.emit('buffExpired', { name: buff.decorator.getName() });
    }

    this.activeBuffs = this.activeBuffs.filter(
      b => b.expiresAt === -1 || b.expiresAt > now
    );
  }

  getDecoratedStats(): IPlayerStats {
    if (!this.baseStats) throw new Error('BuffManager not initialized');

    let stats: IPlayerStats = this.baseStats;
    for (const buff of this.activeBuffs) {
      // Re-wrap with current chain
      const DecoratorClass = buff.decorator.constructor as new (w: IPlayerStats) => StatDecorator;
      stats = new DecoratorClass(stats);
    }
    return stats;
  }

  getActiveBuffs(): { name: string; icon: string; remainingMs: number }[] {
    const now = Date.now();
    return this.activeBuffs.map(b => ({
      name: b.decorator.getName(),
      icon: b.decorator.getIcon(),
      remainingMs: b.expiresAt === -1 ? -1 : Math.max(0, b.expiresAt - now),
    }));
  }

  clear(): void {
    this.activeBuffs = [];
  }
}

export const BuffManager = BuffManagerClass.getInstance();
```

### 1.3 Kullanım
```typescript
// GameEngine.tsx veya CombatSystem.ts içinde
BuffManager.initialize(playerRef.current);
BuffManager.addBuff(RageModeDecorator);

// Her frame'de
BuffManager.update();
const stats = BuffManager.getDecoratedStats();
const damage = stats.getDamage(); // Buff'lı değer
```

### 1.4 Event Types Ekle
```typescript
// types/events.ts'e ekle
export interface BuffAppliedEvent {
  name: string;
  icon: string;
  duration: number;
}

export interface BuffExpiredEvent {
  name: string;
}
```

---

## 2️⃣ Builder Pattern - Enemy/Card Creation

### 2.1 Amaç
- Kompleks enemy tiplerini step-by-step oluşturma
- Boss enemy'leri kolayca tanımlama
- Card'ları modüler şekilde build etme

### 2.2 Enemy Builder

```typescript
// services/patterns/builders/EnemyBuilder.ts
import { type GameEnemy } from '../../factories/EnemyFactory';

type EnemyBehavior = 'chase' | 'swarm' | 'charge' | 'shoot' | 'teleport';

export class EnemyBuilder {
  private enemy: Partial<GameEnemy> = {};
  private behaviors: EnemyBehavior[] = [];

  reset(): this {
    this.enemy = { active: true };
    this.behaviors = [];
    return this;
  }

  setType(type: GameEnemy['type']): this {
    this.enemy.type = type;
    return this;
  }

  setPosition(x: number, y: number): this {
    this.enemy.x = x;
    this.enemy.y = y;
    return this;
  }

  setHealth(hp: number): this {
    this.enemy.health = hp;
    this.enemy.maxHealth = hp;
    return this;
  }

  setSpeed(speed: number): this {
    this.enemy.speed = speed;
    return this;
  }

  setSize(radius: number): this {
    this.enemy.radius = radius;
    return this;
  }

  setColor(color: string): this {
    this.enemy.color = color;
    return this;
  }

  setDamage(damage: number): this {
    this.enemy.damage = damage;
    return this;
  }

  addBehavior(behavior: EnemyBehavior): this {
    this.behaviors.push(behavior);
    return this;
  }

  // Difficulty scaling
  applyDifficultyScaling(difficulty: number): this {
    const scale = 1 + (difficulty - 1) * 0.1;
    if (this.enemy.health) this.enemy.health *= scale;
    if (this.enemy.maxHealth) this.enemy.maxHealth *= scale;
    if (this.enemy.speed) this.enemy.speed *= Math.min(1.5, 1 + difficulty * 0.05);
    return this;
  }

  build(): GameEnemy {
    if (!this.enemy.type) throw new Error('Enemy type is required');

    return {
      active: true,
      x: this.enemy.x ?? 0,
      y: this.enemy.y ?? 0,
      radius: this.enemy.radius ?? 16,
      color: this.enemy.color ?? '#FF0000',
      speed: this.enemy.speed ?? 1,
      health: this.enemy.health ?? 10,
      maxHealth: this.enemy.maxHealth ?? 10,
      type: this.enemy.type,
      damage: this.enemy.damage ?? 10,
      behaviors: this.behaviors,
    } as GameEnemy;
  }
}
```

### 2.3 Enemy Directors
```typescript
// services/patterns/builders/directors/BossDirector.ts
import { EnemyBuilder } from '../EnemyBuilder';
import { type GameEnemy } from '../../../factories/EnemyFactory';
import { COLORS } from '../../../constants';

export class BossDirector {
  constructor(private builder: EnemyBuilder) {}

  createWhaleKing(x: number, y: number, difficulty: number): GameEnemy {
    return this.builder
      .reset()
      .setType('whale')
      .setPosition(x, y)
      .setHealth(500)
      .setSpeed(0.3)
      .setSize(80)
      .setColor(COLORS.WHALE)
      .setDamage(30)
      .addBehavior('charge')
      .addBehavior('teleport')
      .applyDifficultyScaling(difficulty)
      .build();
  }

  createLiquidatorBoss(x: number, y: number, difficulty: number): GameEnemy {
    return this.builder
      .reset()
      .setType('liquidator')
      .setPosition(x, y)
      .setHealth(300)
      .setSpeed(1.5)
      .setSize(50)
      .setColor(COLORS.SUPER_CRIT)
      .setDamage(50)
      .addBehavior('chase')
      .addBehavior('shoot')
      .applyDifficultyScaling(difficulty)
      .build();
  }
}
```

```typescript
// services/patterns/builders/directors/WaveDirector.ts
import { EnemyBuilder } from '../EnemyBuilder';
import { type GameEnemy } from '../../../factories/EnemyFactory';

export class WaveDirector {
  constructor(private builder: EnemyBuilder) {}

  createSwarm(centerX: number, centerY: number, count: number): GameEnemy[] {
    const enemies: GameEnemy[] = [];
    const spread = 50;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      enemies.push(
        this.builder
          .reset()
          .setType('fud')
          .setPosition(
            centerX + Math.cos(angle) * spread,
            centerY + Math.sin(angle) * spread
          )
          .setHealth(15)
          .setSpeed(2.5)
          .setSize(10)
          .addBehavior('swarm')
          .build()
      );
    }
    return enemies;
  }

  createAmbush(positions: { x: number; y: number }[]): GameEnemy[] {
    return positions.map(pos =>
      this.builder
        .reset()
        .setType('bear')
        .setPosition(pos.x, pos.y)
        .setHealth(40)
        .setSpeed(1.8)
        .addBehavior('charge')
        .build()
    );
  }
}
```

### 2.4 Card Builder
```typescript
// services/patterns/builders/CardBuilder.ts
import { type Card, type CardTier } from '../../cards/types';
import { type Player } from '../../../types';

export class CardBuilder {
  private card: Partial<Card> = {};

  reset(): this {
    this.card = {};
    return this;
  }

  setName(name: string): this {
    this.card.name = name;
    return this;
  }

  setDescription(description: string): this {
    this.card.description = description;
    return this;
  }

  setTier(tier: CardTier): this {
    this.card.tier = tier;
    return this;
  }

  setIcon(icon: string): this {
    this.card.icon = icon;
    return this;
  }

  setEffect(effect: (player: Player) => Player): this {
    this.card.effect = effect;
    return this;
  }

  // Common stat modifiers
  addDamageBonus(percent: number): this {
    const prevEffect = this.card.effect ?? ((p: Player) => p);
    this.card.effect = (p: Player) => {
      const modified = prevEffect(p);
      modified.baseDamage *= (1 + percent);
      return modified;
    };
    return this;
  }

  addSpeedBonus(percent: number): this {
    const prevEffect = this.card.effect ?? ((p: Player) => p);
    this.card.effect = (p: Player) => {
      const modified = prevEffect(p);
      modified.speed *= (1 + percent);
      return modified;
    };
    return this;
  }

  addHealthBonus(flat: number): this {
    const prevEffect = this.card.effect ?? ((p: Player) => p);
    this.card.effect = (p: Player) => {
      const modified = prevEffect(p);
      modified.maxHp += flat;
      modified.hp += flat;
      return modified;
    };
    return this;
  }

  build(): Card {
    if (!this.card.name || !this.card.tier || !this.card.effect) {
      throw new Error('Card requires name, tier, and effect');
    }

    return {
      name: this.card.name,
      description: this.card.description ?? '',
      tier: this.card.tier,
      icon: this.card.icon ?? '🎴',
      effect: this.card.effect,
    } as Card;
  }
}
```

---

## 3️⃣ Flyweight Pattern - Particle Optimization

### 3.1 Amaç
- Binlerce parçacık için memory kullanımını azaltma
- Paylaşılan render data ile performans artışı

### 3.2 Types
```typescript
// services/patterns/flyweight/types.ts
export type ParticleType =
  | 'explosion'
  | 'gem_sparkle'
  | 'crit_flash'
  | 'super_crit'
  | 'heal'
  | 'damage'
  | 'dust'
  | 'trail';

// Shared, immutable data (Intrinsic)
export interface ParticleIntrinsic {
  baseColor: string;
  blendMode: GlobalCompositeOperation;
  baseSize: number;
  fadeSpeed: number;
  gravity: number;
}

// Per-instance data (Extrinsic)
export interface ParticleExtrinsic {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  scale: number;
}
```

### 3.3 Flyweight Factory
```typescript
// services/patterns/flyweight/ParticleFlyweightFactory.ts
import { type ParticleType, type ParticleIntrinsic } from './types';
import { COLORS } from '../../../constants';

class ParticleFlyweightFactoryClass {
  private static instance: ParticleFlyweightFactoryClass | null = null;
  private cache: Map<ParticleType, ParticleIntrinsic> = new Map();

  static getInstance(): ParticleFlyweightFactoryClass {
    return (ParticleFlyweightFactoryClass.instance ??= new ParticleFlyweightFactoryClass());
  }

  private constructor() {
    this.preloadAll();
  }

  private preloadAll(): void {
    const definitions: Record<ParticleType, ParticleIntrinsic> = {
      explosion: {
        baseColor: COLORS.NEON_ORANGE,
        blendMode: 'lighter',
        baseSize: 4,
        fadeSpeed: 0.03,
        gravity: 0.1,
      },
      gem_sparkle: {
        baseColor: COLORS.GEM,
        blendMode: 'screen',
        baseSize: 3,
        fadeSpeed: 0.02,
        gravity: -0.05, // Float up
      },
      crit_flash: {
        baseColor: COLORS.CRIT,
        blendMode: 'lighter',
        baseSize: 6,
        fadeSpeed: 0.05,
        gravity: 0,
      },
      super_crit: {
        baseColor: COLORS.SUPER_CRIT,
        blendMode: 'lighter',
        baseSize: 8,
        fadeSpeed: 0.04,
        gravity: 0,
      },
      heal: {
        baseColor: COLORS.NEON_GREEN,
        blendMode: 'screen',
        baseSize: 3,
        fadeSpeed: 0.02,
        gravity: -0.1,
      },
      damage: {
        baseColor: '#FF0000',
        blendMode: 'source-over',
        baseSize: 2,
        fadeSpeed: 0.04,
        gravity: 0.2,
      },
      dust: {
        baseColor: '#888888',
        blendMode: 'source-over',
        baseSize: 2,
        fadeSpeed: 0.01,
        gravity: 0.05,
      },
      trail: {
        baseColor: COLORS.BULLET,
        blendMode: 'lighter',
        baseSize: 2,
        fadeSpeed: 0.08,
        gravity: 0,
      },
    };

    for (const [type, intrinsic] of Object.entries(definitions)) {
      this.cache.set(type as ParticleType, Object.freeze(intrinsic));
    }
  }

  get(type: ParticleType): ParticleIntrinsic {
    const intrinsic = this.cache.get(type);
    if (!intrinsic) {
      throw new Error(`Unknown particle type: ${type}`);
    }
    return intrinsic;
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export const ParticleFlyweightFactory = ParticleFlyweightFactoryClass.getInstance();
```

### 3.4 Optimized Particle Class
```typescript
// services/patterns/flyweight/OptimizedParticle.ts
import { type ParticleType, type ParticleIntrinsic, type ParticleExtrinsic } from './types';
import { ParticleFlyweightFactory } from './ParticleFlyweightFactory';

export class OptimizedParticle {
  public active: boolean = true;
  private extrinsic: ParticleExtrinsic;
  private readonly intrinsic: ParticleIntrinsic;

  constructor(
    type: ParticleType,
    x: number,
    y: number,
    vx: number,
    vy: number
  ) {
    this.intrinsic = ParticleFlyweightFactory.get(type);
    this.extrinsic = { x, y, vx, vy, life: 1, scale: 1 };
  }

  update(dt: number): void {
    if (!this.active) return;

    this.extrinsic.x += this.extrinsic.vx * dt;
    this.extrinsic.y += this.extrinsic.vy * dt;
    this.extrinsic.vy += this.intrinsic.gravity * dt;
    this.extrinsic.life -= this.intrinsic.fadeSpeed * dt;

    if (this.extrinsic.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const { x, y, life, scale } = this.extrinsic;
    const { baseColor, blendMode, baseSize } = this.intrinsic;

    ctx.save();
    ctx.globalCompositeOperation = blendMode;
    ctx.globalAlpha = life;
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(x, y, baseSize * scale * life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Getters for external access
  get x(): number { return this.extrinsic.x; }
  get y(): number { return this.extrinsic.y; }
  get life(): number { return this.extrinsic.life; }
}
```

### 3.5 Entegrasyon
```typescript
// PoolManager veya ParticleSystem'a entegre et
import { OptimizedParticle } from './patterns/flyweight/OptimizedParticle';
import { type ParticleType } from './patterns/flyweight/types';

class ParticlePool {
  private active: OptimizedParticle[] = [];
  private free: OptimizedParticle[] = [];

  spawn(type: ParticleType, x: number, y: number, vx: number, vy: number): void {
    // Flyweight sayesinde sadece extrinsic data yeniden oluşturulur
    const particle = new OptimizedParticle(type, x, y, vx, vy);
    this.active.push(particle);
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i]!;
      p.update(dt);
      if (!p.active) {
        this.active.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.active) {
      p.draw(ctx);
    }
  }
}
```

---

## 4️⃣ Chain of Responsibility - Damage Pipeline

### 4.1 Amaç
- Hasar hesaplamalarını modüler hale getirme
- Yeni hasar modifikatörleri kolayca ekleme
- Debug ve logging kolaylığı

### 4.2 Damage Context
```typescript
// services/patterns/damage-pipeline/DamageContext.ts
import { type Player, type Enemy } from '../../../types';

export interface DamageContext {
  // Input
  baseDamage: number;
  source: 'player' | 'enemy' | 'market' | 'environment';
  attacker: Player | Enemy | null;
  target: Player | Enemy;

  // Modifiers (set by handlers)
  isCrit: boolean;
  isSuperCrit: boolean;
  isBlocked: boolean;

  // Calculated
  finalDamage: number;
  damageBreakdown: DamageBreakdownEntry[];
}

export interface DamageBreakdownEntry {
  handler: string;
  modifier: number;
  description: string;
}

export function createDamageContext(
  baseDamage: number,
  source: DamageContext['source'],
  attacker: DamageContext['attacker'],
  target: DamageContext['target']
): DamageContext {
  return {
    baseDamage,
    source,
    attacker,
    target,
    isCrit: false,
    isSuperCrit: false,
    isBlocked: false,
    finalDamage: baseDamage,
    damageBreakdown: [{ handler: 'Base', modifier: baseDamage, description: 'Base damage' }],
  };
}
```

### 4.3 Abstract Handler
```typescript
// services/patterns/damage-pipeline/DamageHandler.ts
import { type DamageContext } from './DamageContext';

export abstract class DamageHandler {
  protected next: DamageHandler | null = null;

  setNext(handler: DamageHandler): DamageHandler {
    this.next = handler;
    return handler;
  }

  handle(context: DamageContext): DamageContext {
    const processed = this.process(context);
    if (this.next) {
      return this.next.handle(processed);
    }
    return processed;
  }

  protected abstract process(context: DamageContext): DamageContext;
  protected abstract getName(): string;

  protected addBreakdown(
    context: DamageContext,
    modifier: number,
    description: string
  ): void {
    context.damageBreakdown.push({
      handler: this.getName(),
      modifier,
      description,
    });
  }
}
```

### 4.4 Concrete Handlers
```typescript
// services/patterns/damage-pipeline/handlers/CriticalHitHandler.ts
import { DamageHandler } from '../DamageHandler';
import { type DamageContext } from '../DamageContext';
import { type Player } from '../../../../types';

export class CriticalHitHandler extends DamageHandler {
  protected getName(): string { return 'CriticalHit'; }

  protected process(context: DamageContext): DamageContext {
    if (context.source !== 'player' || !context.attacker) return context;

    const player = context.attacker as Player;
    const roll = Math.random();

    if (roll < player.critChance * 0.1) {
      // Super Crit (10% of crit chance)
      context.isSuperCrit = true;
      context.isCrit = true;
      context.finalDamage *= 4;
      this.addBreakdown(context, 4, 'Super Critical Hit! (4x)');
    } else if (roll < player.critChance) {
      // Normal Crit
      context.isCrit = true;
      context.finalDamage *= 2;
      this.addBreakdown(context, 2, 'Critical Hit! (2x)');
    }

    return context;
  }
}
```

```typescript
// services/patterns/damage-pipeline/handlers/ArmorHandler.ts
import { DamageHandler } from '../DamageHandler';
import { type DamageContext } from '../DamageContext';

export class ArmorHandler extends DamageHandler {
  protected getName(): string { return 'Armor'; }

  protected process(context: DamageContext): DamageContext {
    const armor = (context.target as any).armor ?? 0;
    if (armor <= 0) return context;

    // Armor reduces damage (diminishing returns)
    const reduction = armor / (armor + 50); // At 50 armor = 50% reduction
    const reducedAmount = context.finalDamage * reduction;
    context.finalDamage = Math.max(1, context.finalDamage - reducedAmount);

    this.addBreakdown(
      context,
      -reducedAmount,
      `Armor reduction (${Math.round(reduction * 100)}%)`
    );

    return context;
  }
}
```

```typescript
// services/patterns/damage-pipeline/handlers/ComboMultiplierHandler.ts
import { DamageHandler } from '../DamageHandler';
import { type DamageContext } from '../DamageContext';
import { ComboSystem } from '../../../ComboSystem';

export class ComboMultiplierHandler extends DamageHandler {
  protected getName(): string { return 'ComboBonus'; }

  protected process(context: DamageContext): DamageContext {
    if (context.source !== 'player') return context;

    const multiplier = ComboSystem.getMultiplier();
    if (multiplier > 1) {
      const bonus = context.finalDamage * (multiplier - 1);
      context.finalDamage *= multiplier;
      this.addBreakdown(context, bonus, `Combo x${multiplier.toFixed(1)}`);
    }

    return context;
  }
}
```

```typescript
// services/patterns/damage-pipeline/handlers/BuffHandler.ts
import { DamageHandler } from '../DamageHandler';
import { type DamageContext } from '../DamageContext';
import { BuffManager } from '../../decorators/BuffManager';

export class BuffHandler extends DamageHandler {
  protected getName(): string { return 'Buffs'; }

  protected process(context: DamageContext): DamageContext {
    if (context.source !== 'player') return context;

    const stats = BuffManager.getDecoratedStats();
    const buffedDamage = stats.getDamage();
    const baseDamage = context.baseDamage;

    if (buffedDamage !== baseDamage) {
      const multiplier = buffedDamage / baseDamage;
      context.finalDamage *= multiplier;
      this.addBreakdown(
        context,
        context.finalDamage - (context.finalDamage / multiplier),
        `Buff damage (${Math.round((multiplier - 1) * 100)}%)`
      );
    }

    return context;
  }
}
```

### 4.5 Pipeline Factory
```typescript
// services/patterns/damage-pipeline/DamagePipeline.ts
import { DamageHandler } from './DamageHandler';
import { CriticalHitHandler } from './handlers/CriticalHitHandler';
import { ArmorHandler } from './handlers/ArmorHandler';
import { ComboMultiplierHandler } from './handlers/ComboMultiplierHandler';
import { BuffHandler } from './handlers/BuffHandler';
import { type DamageContext, createDamageContext } from './DamageContext';
import { type Player, type Enemy } from '../../../types';

class DamagePipelineClass {
  private static instance: DamagePipelineClass | null = null;
  private pipeline: DamageHandler;

  private constructor() {
    // Build the chain
    const critHandler = new CriticalHitHandler();
    const buffHandler = new BuffHandler();
    const comboHandler = new ComboMultiplierHandler();
    const armorHandler = new ArmorHandler();

    // Order matters: Buffs → Crit → Combo → Armor
    critHandler
      .setNext(buffHandler)
      .setNext(comboHandler)
      .setNext(armorHandler);

    this.pipeline = critHandler;
  }

  static getInstance(): DamagePipelineClass {
    return (DamagePipelineClass.instance ??= new DamagePipelineClass());
  }

  calculatePlayerDamage(
    baseDamage: number,
    player: Player,
    target: Enemy
  ): DamageContext {
    const context = createDamageContext(baseDamage, 'player', player, target);
    return this.pipeline.handle(context);
  }

  calculateEnemyDamage(
    baseDamage: number,
    enemy: Enemy,
    player: Player
  ): DamageContext {
    const context = createDamageContext(baseDamage, 'enemy', enemy, player);
    return this.pipeline.handle(context);
  }
}

export const DamagePipeline = DamagePipelineClass.getInstance();
```

### 4.6 Kullanım
```typescript
// CombatSystem.ts içinde
import { DamagePipeline } from './patterns/damage-pipeline/DamagePipeline';

// Bullet hits enemy
const result = DamagePipeline.calculatePlayerDamage(
  bullet.damage,
  player,
  enemy
);

enemy.health -= result.finalDamage;

if (result.isSuperCrit) {
  audio.playSuperCrit();
  // VFX
} else if (result.isCrit) {
  audio.playCrit();
}

// Debug: damage breakdown
Logger.debug('[Combat] Damage breakdown:', result.damageBreakdown);
```

---

## ✅ Implementation Checklist

### Phase 1: Decorator Pattern (Buff/Debuff)
- [ ] `IPlayerStats.ts` interface oluştur
- [ ] `PlayerStatsAdapter.ts` oluştur
- [ ] `BaseDecorator.ts` abstract class oluştur
- [ ] 3 buff decorator oluştur (Rage, DiamondHands, Berserk)
- [ ] 3 debuff decorator oluştur (Slow, Vulnerable, Liquidated)
- [ ] `BuffManager.ts` singleton oluştur
- [ ] Event types ekle (buffApplied, buffExpired)
- [ ] GameEngine entegrasyonu
- [ ] Unit testleri yaz

### Phase 2: Builder Pattern
- [ ] `EnemyBuilder.ts` oluştur
- [ ] `BossDirector.ts` oluştur
- [ ] `WaveDirector.ts` oluştur
- [ ] `CardBuilder.ts` oluştur
- [ ] Mevcut EnemyFactory'yi refactor et
- [ ] Unit testleri yaz

### Phase 3: Flyweight Pattern
- [ ] `types.ts` oluştur
- [ ] `ParticleFlyweightFactory.ts` oluştur
- [ ] `OptimizedParticle.ts` oluştur
- [ ] Mevcut particle sistemini migrate et
- [ ] Performance benchmark yap
- [ ] Unit testleri yaz

### Phase 4: Chain of Responsibility
- [ ] `DamageContext.ts` oluştur
- [ ] `DamageHandler.ts` abstract class oluştur
- [ ] 4 concrete handler oluştur
- [ ] `DamagePipeline.ts` singleton oluştur
- [ ] CombatSystem entegrasyonu
- [ ] PhysicsSystem entegrasyonu
- [ ] Unit testleri yaz

---

## 📊 Expected Benefits

| Pattern | Memory | Performance | Maintainability | Extensibility |
|---------|--------|-------------|-----------------|---------------|
| Decorator | - | - | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Builder | - | - | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Flyweight | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Chain of Resp. | - | - | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🚀 Quick Start

1. Bu workflow'u okuyun
2. Phase 1 (Decorator) ile başlayın - en çok değer katar
3. Her phase için branch oluşturun: `feature/decorator-pattern`
4. Test coverage %80+ tutun
5. Merge before moving to next phase
