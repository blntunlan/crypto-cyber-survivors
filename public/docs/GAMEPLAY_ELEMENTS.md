# Gameplay Elements Reference

> Complete documentation of all player capabilities and game elements encountered during gameplay.

---

## Table of Contents

1. [Player Capabilities](#player-capabilities)
   - [Movement Controls](#1-movement-controls)
   - [Combat System](#2-combat-system)
   - [Player Statistics](#3-player-statistics)
   - [Level-Up Card System](#4-level-up-card-system)
   - [Buffs & Debuffs](#5-buffs--debuffs)
2. [Game Elements](#game-elements)
   - [Enemy Types](#1-enemy-types)
   - [Boss & Elite Enemies](#2-boss--elite-enemies)
   - [Collectibles](#3-collectibles)
   - [Portal System](#4-portal-system)
   - [Market Events](#5-market-events)
   - [Wave Phases](#6-wave-phases-5-minute-cycle)
   - [Combo System](#7-combokill-streak-system)
   - [Milestones](#8-milestone-achievements)
3. [AI Director System](#ai-director-system)
   - [Architecture Overview](#architecture-overview)
   - [Difficulty Factors](#difficulty-factors)
   - [Neural Network Outputs](#neural-network-outputs)
   - [Configuration Parameters](#configuration-parameters)

---

## Player Capabilities

### 1. Movement Controls

| Control | Platform | Description |
|---------|----------|-------------|
| **WASD** | Desktop | 8-directional movement |
| **Arrow Keys** | Desktop | Alternative 8-directional movement |
| **Dash** | All | Quick evasion mechanic (cooldown-based) |
| **Virtual Joystick** | Mobile | Touch-based movement control |
| **Drag Anywhere** | Mobile | Touch and drag from any screen position |

**Movement Stats:**
- **Base Speed:** 150 units/second
- **Dash Distance:** ~100 units
- **Dash Cooldown:** ~1.5 seconds

**Source Files:**
- `services/player/PlayerMovement.ts`
- `services/input/InputManager.ts`
- `components/mobile/VirtualJoystick.tsx`

---

### 2. Combat System

#### Automatic Attack
The player fires projectiles automatically at the nearest enemy within range.

| Property | Base Value | Description |
|----------|------------|-------------|
| **Fire Rate** | ~0.5s | Time between shots |
| **Projectile Speed** | 400 | Units per second |
| **Projectile Count** | 1 | Bullets per shot |
| **Range** | Infinite | Auto-targets nearest enemy |
| **Crit Chance** | 5% | Chance for critical hit |
| **Crit Damage** | 150% | Critical hit multiplier |

#### Damage Calculation
```
finalDamage = baseDamage × critMultiplier × buffMultipliers - enemyArmor
```

**Source Files:**
- `services/combat/CombatSystem.ts`
- `services/combat/ProjectileManager.ts`
- `services/player/PlayerCombat.ts`

---

### 3. Player Statistics

#### Base Stats

| Stat | Base Value | Description | Upgradeable |
|------|------------|-------------|-------------|
| **HP (Health)** | 100 | Hit points | ✅ |
| **Damage** | 10 | Base attack damage | ✅ |
| **Speed** | 150 | Movement speed | ✅ |
| **Attack Speed** | 100% | Fire rate multiplier | ✅ |
| **Armor** | 0 | Flat damage reduction | ✅ |
| **Crit Chance** | 5% | Critical hit probability | ✅ |
| **Crit Damage** | 150% | Critical hit multiplier | ✅ |
| **Lifesteal** | 0% | HP gained per hit | ✅ |
| **Luck** | 0 | Drop quality modifier | ✅ |
| **Magnet** | 50 | XP pickup radius | ✅ |
| **Projectile Size** | 100% | Bullet size multiplier | ✅ |
| **Area** | 100% | Effect area multiplier | ✅ |

#### Derived Stats

| Stat | Formula | Description |
|------|---------|-------------|
| **DPS** | `damage × (1 + critChance × (critDamage - 1)) × attackSpeed` | Damage per second |
| **EHP** | `HP × (1 + armor × 0.06)` | Effective HP with armor |
| **Pickup Range** | `basePickup + magnet` | Actual XP collection radius |

**Source Files:**
- `config/PlayerConfig.ts`
- `config/StatRegistry.ts`
- `types.ts` (IPlayerStats interface)

---

### 4. Level-Up Card System

When the player gains enough XP to level up, they choose from 3 random cards.

#### Experience Requirements

| Level Range | Formula | Example |
|-------------|---------|---------|
| **1-25** | `350 × level^1.55` | Level 10 = ~12,400 XP |
| **25+** | `baseAtLevel25 + (level - 25) × 800` | Linear scaling |

#### Card Tiers

##### Common Cards (8 cards)

| Card Name | Effects | Theme |
|-----------|---------|-------|
| **Market Order** | +8 Damage | Basic trade |
| **Quick Trade** | +8% Attack Speed | Speed execution |
| **Safety Net** | +15 HP | Risk management |
| **Yield Farm** | +30 Magnet | DeFi farming |
| **Stop Loss** | +1 Armor | Protection |
| **Sniper Bot** | +3% Crit Chance | Precision trading |
| **DCA Mode** | +5% Lifesteal | Dollar-cost averaging |
| **Rebalance** | +5% All Stats | Portfolio balance |

##### Rare Cards (9 cards)

| Card Name | Effects | Theme |
|-----------|---------|-------|
| **Limit Order** | +15 Damage | Precise entry |
| **High Frequency** | +18% Attack Speed | HFT trading |
| **Insider Info** | +5% Crit Chance | Alpha access |
| **Alpha Leak** | +2 Luck | Early information |
| **Market Cap** | +50% Projectile Size | Market dominance |
| **Double Down** | +1 Projectile | Doubling position |
| **Bull Run** | +15% Speed | Bull market |
| **HODL Shield** | +2 Armor, +10 HP | Diamond hands defense |
| **Short Squeeze** | +12 Damage, +3% Crit | Squeeze the shorts |

##### Epic Cards (9 cards)

| Card Name | Effects | Theme |
|-----------|---------|-------|
| **Leverage Trade** | +25 Damage, +10% Crit | High leverage |
| **Staking Rewards** | +12% Lifesteal | Passive income |
| **Flash Loan** | +30% Speed, +15% ATK Speed | DeFi flash loan |
| **Cold Wallet** | +40 HP, +3 Armor | Cold storage security |
| **Liquidation** | +20 Damage, +60% Area | Liquidation event |
| **Lightning Network** | +15 Damage, +8% Crit | Fast transactions |
| **Smart Contract** | +30 HP, +8% Lifesteal | Automated security |
| **Degenerate** | +35 Damage | Full degen mode |
| **Banano Split** | +20% Speed, +1 Luck | Meme coin energy |

##### Legendary Cards (8+ cards)

| Card Name | Effects | Theme |
|-----------|---------|-------|
| **Diamond Hands** | +40 Damage, +15% Crit | Ultimate HODL |
| **To The Moon** | +30 Damage, +3 Luck | Moon mission |
| **Whale Alert** | +20 Damage, +0.5 Area | Whale power |
| **Full Ape Mode** | 2× Fire Rate, -20% HP | YOLO investment |
| **Satoshi Mode** | +50 Damage, -25% Fire Rate | Bitcoin founder power |
| **Rug Pull** | +20% Lifesteal, -15% HP | Risky but rewarding |
| **NFT Collection** | +5 Random Stats | Digital collectibles |
| **Time Lock** | +35 Damage, +20 HP | Locked liquidity |
| **Gas Fee Burn** | +25 Damage, +0.4 Area | ETH gas burn |

**Source Files:**
- `config/StatRegistry.ts`
- `services/upgrades/CardManager.ts`
- `components/screens/LevelUpScreen.tsx`

---

### 5. Buffs & Debuffs

#### Positive Buffs

| Buff | Icon | Color | Effect | Duration | Rarity |
|------|------|-------|--------|----------|--------|
| **Rage** | 🔥 | `#FF6B00` | +50% Damage | 10s | 25% |
| **Diamond** | 💎 | `#00D4FF` | +30% Damage Resistance | 10s | 15% |
| **Berserk** | ⚡ | `#FFD700` | +40% Attack Speed | 10s | 20% |
| **Lucky** | 🍀 | `#00FF88` | +100% Drop Quality | 10s | 25% |

#### Negative Debuffs

| Debuff | Icon | Color | Effect | Duration | Rarity |
|--------|------|-------|--------|----------|--------|
| **Slow** | 🐌 | `#8B4513` | -30% Movement Speed | 5s | 10% |
| **Vulnerable** | 💀 | `#8B0000` | +50% Damage Taken | 5s | 5% |
| **Liquidated** | 💥 | `#FF0000` | Instant Death | - | Event |
| **Weakened** | ⬇️ | `#666666` | -25% Damage | 5s | Combat |

#### Buff Spawn Rules

- **Grace Period:** 10 seconds before first buff spawn
- **Max Active:** 3 buff gems on screen
- **Lifetime:** 5 seconds before despawn
- **Trigger:** Market volatility changes

**Source Files:**
- `services/patterns/decorators/` (all buff decorators)
- `services/combat/BuffManager.ts`
- `services/gems/BuffGemManager.ts`

---

## Game Elements

### 1. Enemy Types

#### Standard Enemies

| Enemy | HP | Speed | Damage | Spawn % | Behavior | Market Context |
|-------|-----|-------|--------|---------|----------|----------------|
| **Bear 🐻** | 50 | 1.2-1.6 | 5-10 | 60% | Direct chase | SHORT position opposite |
| **Bull 🐂** | 70 | 1.4-1.8 | 8-12 | 25% | Flanking circle | LONG position opposite |
| **FUD 😰** | 30 | 1.6-2.2 | 3-5 | 10% | ZigZag evasion | Fear/Uncertainty |
| **Whale 🐋** | 300 | 0.8 | 25 | 5% | Slow approach | Large holder |
| **Liquidator 💥** | 40 | 1.5-2.0 | 10-30 | 8% | Speed boost near player | Liquidation event |
| **PumpDump 📈** | 80 | 1.2 | 12-15 | 6% | Grows in size | Pump & dump scheme |
| **RSI 📊** | 60 | 1.8 | 6 | 10% | Market indicator | RSI extremes |
| **Gatekeeper** | 150 | 1.0 | 15 | Portal | Orbits portal | Portal sentinel |

#### Enemy Movement Strategies

| Strategy | Used By | Behavior Pattern |
|----------|---------|------------------|
| **ChaseStrategy** | Bear | Direct pursuit toward player |
| **SlowApproachStrategy** | Whale | Slow, intimidating approach |
| **ZigZagStrategy** | FUD | Side-to-side evasive movement |
| **CircleStrategy** | Bull | Flanking orbit movement |
| **MenacingStrategy** | Whale (alt) | Slow with pauses |
| **ExplosiveStrategy** | Liquidator | Speed increases near player |
| **GrowingStrategy** | PumpDump | Size increases over time |

#### Spawn Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Base Interval** | 800ms | Time between spawns at difficulty 1 |
| **Min Interval** | 300ms | Minimum spawn delay |
| **Spawn Distance** | 100px | Distance outside viewport |
| **Max Enemies** | 150 | Performance cap |
| **Thematic Chance** | 70% | Chance for market-themed enemy |
| **Whale Cooldown** | 20,000ms | Minimum time between whale spawns |

**Source Files:**
- `config/EnemyRegistry.ts`
- `config/EnemyConfig.ts`
- `services/enemy/EnemyManager.ts`
- `services/spawning/SpawnSystem.ts`
- `strategies/enemy/` (movement strategies)

---

### 2. Boss & Elite Enemies

#### Boss Types

| Boss | HP | Damage | Trigger | Special |
|------|-----|--------|---------|---------|
| **Market Maker** | 2500 | 40 | Cycle end (manual) | Ultimate boss |
| **Mega Whale** | 4× base | 50 | Volume >95th percentile | Rare spawn |

#### Whale Tiers (Volume-Based)

| Tier | Volume Threshold | Size Multiplier | HP Multiplier | Value Multiplier |
|------|------------------|-----------------|---------------|------------------|
| **Tier 0** | <30% | - | - | - (No whale) |
| **Tier 1 (Baby)** | 30-60% | 1.3× | 1.5× | 2× |
| **Tier 2 (Normal)** | 60-90% | 1.6× | 2.5× | 3× |
| **Tier 3 (Mega)** | >95% | 2.0× | 4.0× | 5× |

#### Gatekeeper Formation

- **Spawn Count:** 8 per portal
- **Formation:** Circular orbit around portal
- **Behavior:** Must be defeated to use portal

**Source Files:**
- `services/enemy/BossManager.ts`
- `services/spawning/WhaleSpawner.ts`
- `services/portal/PortalManager.ts`

---

### 3. Collectibles

#### Experience Gems

| Type | Color | Hex Code | Value | Spawn Condition |
|------|-------|----------|-------|-----------------|
| **Normal Gem** | Gold | `#FFD700` | Base XP | Standard drop |
| **Rare Gem** | Neon Pink | `#FF10F0` | 2× XP + Luck bonus | Luck-based spawn |
| **Bonus Gem** | Varies | - | Extra XP | High-luck builds |

#### XP Scaling

| Enemy Type | Base XP | With Luck |
|------------|---------|-----------|
| **Bear** | 10 | 10 × (1 + luck × 0.1) |
| **Bull** | 15 | 15 × (1 + luck × 0.1) |
| **FUD** | 5 | 5 × (1 + luck × 0.1) |
| **Whale** | 100 | 100 × (1 + luck × 0.1) |
| **Liquidator** | 20 | 20 × (1 + luck × 0.1) |

#### Buff Gems

| Gem Type | Color | Effect | Rarity Weight |
|----------|-------|--------|---------------|
| **Rage Gem** 🔥 | Orange | Damage boost | 0.25 |
| **Diamond Gem** 💎 | Cyan | Damage resistance | 0.15 |
| **Berserk Gem** ⚡ | Gold | Attack speed | 0.20 |
| **Lucky Gem** 🍀 | Green | Better drops | 0.25 |
| **Slow Gem** 🐌 | Brown | Movement debuff | 0.10 |
| **Vulnerable Gem** 💀 | Dark Red | Defense debuff | 0.05 |

**Source Files:**
- `services/gems/GemManager.ts`
- `services/gems/BuffGemManager.ts`
- `config/ExperienceConfig.ts`

---

### 4. Portal System

#### Portal Types

| Portal | Color | Trigger Condition | Duration | Cooldown |
|--------|-------|-------------------|----------|----------|
| **Take Profit** 🟢 | Green | PnL > +10% | 25s | 45s |
| **Stop Loss** 🔴 | Red | PnL < -15% | 25s | 45s |

#### Portal Mechanics

- **Spawn Timing:** Only after 60 seconds of gameplay
- **Gatekeeper Spawn:** 8 enemies orbit portal
- **Interaction:** Walk into portal to exit game
- **Coin Calculation:** `rawCoins + (survivalTime/10 × PnL%)`

#### Portal Visual Effects

| Effect | Description |
|--------|-------------|
| **Swirl Animation** | Rotating vortex effect |
| **Particle Trail** | Sparkles flowing inward |
| **Pulse Glow** | Rhythmic intensity change |
| **Gatekeeper Orbit** | Enemies circle the portal |

**Source Files:**
- `services/portal/PortalManager.ts`
- `services/portal/PortalRenderer.ts`
- `components/hud/PortalIndicator.tsx`

---

### 5. Market Events

#### Event Types

| Event | Trigger | Duration | Visual | Gameplay Effect |
|-------|---------|----------|--------|-----------------|
| **Volume Spike** | Volume >90th percentile | 20s | "Flash Mob" banner | Increased spawn rate |
| **Whale Alert** | Whale tier ≥2 | 30s | "Boss Wave" banner | Whale spawns |
| **Flash Crash** | Price drop >0.5% | 15s | "Panic Mode" banner | 70% Liquidators, 30% FUD |
| **Price Breakout** | RSI extremes | 25s | "Momentum Shift" banner | Directional enemies |
| **Consolidation** | Low ATR + neutral RSI | 30s | "Calm Before Storm" banner | Reduced intensity |

#### Market Condition Effects

| Market State | Enemy Composition | Difficulty Modifier |
|--------------|-------------------|---------------------|
| **OVERSOLD** (RSI <30) | Bears, FUD, Liquidators | +20% spawn rate |
| **OVERBOUGHT** (RSI >70) | Bulls, PumpDumps, RSI | +15% enemy speed |
| **HIGH VOLATILITY** (ATR >2%) | Mixed aggressive | +30% difficulty |
| **LOW VOLATILITY** (ATR <0.5%) | Slower enemies | -15% difficulty |

**Source Files:**
- `services/market/MarketEventManager.ts`
- `services/market/MarketIndicatorService.ts`
- `components/hud/MarketEventBanner.tsx`

---

### 6. Wave Phases (5-Minute Cycle)

The game operates on a 5-minute (300 second) difficulty cycle:

| Phase | Time Range | Duration | Multiplier | Description |
|-------|------------|----------|------------|-------------|
| **Warmup** | 0:00 - 0:45 | 45s | 0.3× | Easy introduction |
| **Buildup** | 0:45 - 1:45 | 60s | 0.5× | Gradual increase |
| **First Peak** | 1:45 - 2:15 | 30s | 1.3× | First challenge |
| **Breather** | 2:15 - 3:00 | 45s | 0.6× | Recovery period |
| **Escalation** | 3:00 - 4:00 | 60s | 1.15× | Building tension |
| **Climax** | 4:00 - 4:45 | 45s | 1.5× | Maximum intensity |
| **Resolution** | 4:45 - 5:00 | 15s | 0.5× | Cycle conclusion |

#### Phase Transitions

```
Warmup → Buildup → First Peak → Breather → Escalation → Climax → Resolution
   ↑                                                                    ↓
   └────────────────────── Cycle Repeats ───────────────────────────────┘
```

**Source Files:**
- `services/difficulty/factors/WaveFactor.ts`
- `services/director/PhaseManager.ts`

---

### 7. Combo/Kill Streak System

#### Combo Milestones

| Milestone | Kill Count | XP Multiplier | Sound Effect | Visual |
|-----------|------------|---------------|--------------|--------|
| **COMBO!** | 5 | 1.2× | `combo1.wav` | Small flash |
| **SUPER COMBO!** | 10 | 1.5× | `combo2.wav` | Medium flash |
| **MEGA COMBO!** | 25 | 2.0× | `combo3.wav` | Large flash |
| **ULTRA COMBO!** | 50 | 2.5× | `combo4.wav` | Screen shake |
| **JACKPOT!** | 100 | 3.0× | `combo5.wav` | Epic celebration |

#### Combo Mechanics

- **Timeout:** 3 seconds between kills to maintain combo
- **Reset:** Combo resets on timeout or player death
- **Bonus:** Higher combos increase gem drop quality

**Source Files:**
- `services/combat/ComboSystem.ts`
- `components/hud/ComboCounter.tsx`
- `config/AudioRegistry.ts`

---

### 8. Milestone Achievements

#### Kill Milestones

| Milestone | Kill Count | Icon | Announcement |
|-----------|------------|------|--------------|
| **CENTURION** | 100 | ⚔️ | "100 KILLS - CENTURION!" |
| **SLAYER** | 250 | 🗡️ | "250 KILLS - SLAYER!" |
| **DESTROYER** | 500 | 💀 | "500 KILLS - DESTROYER!" |
| **ANNIHILATOR** | 1000 | 🔥 | "1000 KILLS - ANNIHILATOR!" |
| **LEGEND** | 2500 | 👑 | "2500 KILLS - LEGEND!" |

#### Time Milestones

| Milestone | Time | Icon | Announcement |
|-----------|------|------|--------------|
| **1 MINUTE!** | 60s | ⏱️ | "1 MINUTE SURVIVED!" |
| **3 MINUTES!** | 180s | ⏱️ | "3 MINUTES SURVIVED!" |
| **5 MINUTES!** | 300s | ⏱️ | "5 MINUTES SURVIVED!" |
| **10 MINUTES!** | 600s | 🏆 | "10 MINUTES - LEGENDARY!" |

**Source Files:**
- `services/progression/MilestoneManager.ts`
- `components/hud/MilestonePopup.tsx`

---

## AI Director System

### Architecture Overview

The AI Director uses a **Neuro-Dynamic Difficulty** system with neural networks to adaptively adjust game difficulty based on market data and player performance.

```
┌─────────────────────────────────────────────────────────────────┐
│                        MARKET DATA                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │   RSI   │ │  MACD   │ │   ATR   │ │ Volume  │ │   PnL   │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
└───────┼──────────┼──────────┼──────────┼──────────┼──────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DIFFICULTYCONTEXT (Layer 3)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Factor Calculators (15+):                                 │  │
│  │ Cycle, PnL, Level, Wave, Liquidation, Streak, Shock,     │  │
│  │ RSI, Volume, ATR, NearDeath, Performance, Stress, etc.   │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                           ▼                                     │
│  core × modifier × market × performance = total difficulty      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  AIDirector   │  │GameMasterBrain│  │ DifficultyMgr │
│  (9→6→3 NN)   │  │ (14→20→12 NN) │  │  (Layer 4)    │
│               │  │               │  │               │
│ spawnDensity  │  │ spawnRate     │  │ Combines all  │
│ enemySpeedMod │  │ enemySpeed/HP │  │ outputs into  │
│ aggression    │  │ gemDropRate   │  │ final engine  │
│               │  │ whaleType     │  │ parameters    │
│               │  │ chaos/mercy   │  │               │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GAME ENGINE OUTPUTS                        │
│  spawnRate | enemySpeed | enemyHP | enemyDamage | gemDrops     │
└─────────────────────────────────────────────────────────────────┘
```

### Difficulty Factors

#### Factor Categories

| Category | Factors | Weight |
|----------|---------|--------|
| **Core** | Cycle, PnL, Level | 60% |
| **Modifier** | Liquidation, Streak, NearDeath, Shock | 25% |
| **Market** | RSI, Volume, ATR | 15% |

#### Individual Factors

| Factor | Source | Effect Range | Description |
|--------|--------|--------------|-------------|
| **CycleFactor** | Elapsed time | 1.0× - 2.0× | +5% per minute |
| **PnLFactor** | Trade P&L | 0.7× - 3.0× | Loss=harder, Profit=easier |
| **LevelFactor** | Player level | 1.0× - 3.0× | Scales with progression |
| **WaveFactor** | 5-min cycle | 0.3× - 1.5× | Phase-based multiplier |
| **LiquidationFactor** | Distance to liq | 1.0× - 2.0× | Increases near liquidation |
| **StreakFactor** | Kill streak | 1.0× - 1.5× | Temporary boost |
| **ShockFactor** | Price volatility | 1.0× - 2.0× | Spike on sudden moves |
| **RSIFactor** | RSI indicator | 0.8× - 1.3× | Market overbought/oversold |
| **VolumeFactor** | Trading volume | 1.0× - 1.5× | Whale spawn trigger |
| **ATRFactor** | Volatility % | 0.9× - 1.4× | Speed correlation |
| **NearDeathFactor** | HP < 20% | 0.7× | Mercy modifier |
| **PerformanceFactor** | Player skill | 0.8× - 1.3× | Accuracy-based |
| **StressFactor** | Composite | 0.9× - 1.2× | Damage rate + dash usage |

### Neural Network Outputs

#### GameMasterBrain Outputs (12 parameters)

| Output | Range | Description |
|--------|-------|-------------|
| **spawnRateMultiplier** | 0.3× - 2.5× | Enemy spawn frequency |
| **enemySpeedMultiplier** | 0.6× - 1.8× | Movement speed |
| **enemyHPMultiplier** | 0.7× - 2.0× | Health multiplier |
| **enemyDamageMultiplier** | 0.7× - 2.0× | Damage output |
| **gemDropRateMultiplier** | 0.4× - 1.5× | Loot frequency |
| **xpGainMultiplier** | 0.6× - 1.4× | Experience rate |
| **eliteSpawnChance** | 0 - 3 | Special enemy tier |
| **marketEventSeverity** | 0 - 1 | Event intensity |
| **enemyAggressionLevel** | 0 - 1 | AI tracking quality |
| **chaosLevel** | 0 - 1 | Randomness factor |
| **mercyWindowDuration** | 0 - 1 | Respite when struggling |
| **difficultyRampRate** | 0 - 1 | Increase speed |

### Configuration Parameters

#### Main Config (`config/DifficultyConfig.ts`)

```typescript
DIFFICULTY_CONFIG = {
  // Sampling
  PNL_HISTORY_SIZE: 30,
  STREAK_TIMEOUT_MS: 3000,
  SHOCK_THRESHOLD: 0.005,  // 0.5% underlying move

  // Output Limits
  LIMITS: {
    total:       { min: 0.5, max: 7.5 },
    spawnRate:   { min: 0.5, max: 5.0 },
    enemySpeed:  { min: 0.5, max: 6.5 },
    enemyHP:     { min: 0.5, max: 5.0 },
    enemyDamage: { min: 0.8, max: 8.0 },
  },

  // Mercy System
  NEAR_DEATH_HP_THRESHOLD: 20,          // %
  NEAR_DEATH_DIFFICULTY_MODIFIER: 0.7,  // 30% easier
}
```

#### GameMasterBrain Config

```typescript
GAME_MASTER_CONFIG = {
  // Grace Period
  GRACE_PERIOD_SECONDS: 24,
  GRACE_FADE_DURATION: 10,

  // Flow State Targeting
  IDEAL_HP_PERCENT: 50,
  HP_TOLERANCE: 15,  // 35%-65% acceptable

  // Update Frequency
  BRAIN_UPDATE_MS: 500,

  // PnL Thresholds
  PNL_POSITIVE_THRESHOLD: 0.02,   // +2% = flow state
  PNL_NEGATIVE_MILD: -0.05,       // -5% = tension
  PNL_NEGATIVE_SEVERE: -0.15,     // -15% = pressure
  PNL_LIQUIDATION_ZONE: -0.25,    // -25% = maximum chaos
}
```

#### Leverage Scaling

| Leverage | Spawn | Speed | HP | Damage | XP Req |
|----------|-------|-------|-----|--------|--------|
| **1×** | 0.8× | 0.8× | 0.8× | 0.8× | 1.0× |
| **5×** | 1.4× | 1.0× | 1.0× | 1.0× | 1.5× |
| **25×** | 3.0× | 1.25× | 1.2× | 1.4× | 3.5× |
| **100×** | 6.0× | 2.0× | 1.6× | 3.0× | 7.5× |

**Source Files:**
- `services/director/AIDirector.ts`
- `services/director/GameMasterBrain.ts`
- `services/difficulty/DifficultyContext.ts`
- `services/difficulty/DifficultyManager.ts`
- `services/difficulty/factors/` (all factor calculators)
- `docs/AI_DIRECTOR_ARCHITECTURE.md`

---

## Visual Effects Reference

### Combat Effects

| Effect | Trigger | Description |
|--------|---------|-------------|
| **Crit Flash** | Critical hit | Radial pulse at screen edges |
| **Hit Flash** | Enemy damaged | White overlay on enemy |
| **Death Particles** | Enemy killed | Explosion fragments |
| **Floating Damage** | Any damage | Numbers floating upward |

### Player Effects

| Effect | Trigger | Description |
|--------|---------|-------------|
| **Squash-Stretch** | Movement | Organic motion feel |
| **Dash Trail** | Dashing | Ghost images following player |
| **Invincibility Flash** | I-frames | Rapid opacity changes |
| **Level Up Glow** | Level gained | Golden aura expansion |

### Market Effects

| Effect | Trigger | Description |
|--------|---------|-------------|
| **RSI Tint** | Overbought/Oversold | Green/Red screen tint |
| **Volatility Pulse** | High ATR | Vignette intensity |
| **Whale Splash** | Whale spawn | Blue ripple effect |
| **Flash Crash** | Price drop | Red screen shake |

### Background Effects

| Effect | Description |
|--------|-------------|
| **Parallax Candles** | 3-layer candlestick charts |
| **Market Drift** | Background moves with momentum |
| **Grid Lines** | Subtle price level indicators |

**Source Files:**
- `services/renderers/EffectRenderer.ts`
- `services/renderers/EntityRenderer.ts`
- `services/renderers/BackgroundRenderer.ts`

---

## Character Skins

| Skin ID | Display Name | Theme | Unlock Method |
|---------|--------------|-------|---------------|
| `default` | Cyber Trader | Starting skin | Default |
| `diamond_hands` | Diamond Hands Holder | HODLer | Lootbox |
| `whale_watcher` | Whale Watcher | Whale theme | Lootbox |
| `satoshi_ghost` | Satoshi Ghost | Bitcoin founder | Lootbox |
| `vitalik_mode` | Vitalik Mode | Ethereum | Lootbox |
| `solana_sage` | Solana Sage | Solana | Lootbox |
| `degen_ape` | Degen Ape | Meme/Ape | Lootbox |
| `laser_eyes` | Laser Eyes | Bitcoin meme | Lootbox |

**Source Files:**
- `services/cosmetics/SkinManager.ts`
- `config/SkinRegistry.ts`

---

## Lootbox System

### Lootbox Types

| Type | Rarity | Icon | Theme |
|------|--------|------|-------|
| **Mining Crate** | Common | ⛏️ | BTC mining |
| **Gas Box** | Rare | ⛽ | ETH gas fees |
| **Validator Vault** | Epic | 🔐 | Solana staking |
| **Whale Wallet** | Legendary | 🐋 | Whale investor |
| **Flash Crash Crate** | Rare | 📉 | Volatility event |
| **Whale Hunter Box** | Epic | 🎯 | Defeating whales |

### Drop Categories

| Category | Contents |
|----------|----------|
| **Coins** | In-game currency |
| **Consumables** | Damage boost, Speed boost, Kill all, Heal, Revive, XP boost, Coin boost |
| **Skins** | Character cosmetics (Legendary tier) |
| **Tokens** | Crypto tokens (placeholder) |

**Source Files:**
- `services/lootbox/LootboxManager.ts`
- `config/LootboxConfig.ts`
- `docs/LOOTBOX_SYSTEM.md`

---

## Quick Reference Cards

### Player Stat Caps

| Stat | Soft Cap | Hard Cap |
|------|----------|----------|
| **Speed** | 300 | 500 |
| **Attack Speed** | 300% | 500% |
| **Crit Chance** | 50% | 100% |
| **Lifesteal** | 30% | 50% |
| **Armor** | 10 | 20 |

### Enemy Damage Types

| Type | Color | Effect |
|------|-------|--------|
| **Physical** | White | Standard damage |
| **Critical** | Yellow | 150%+ damage |
| **Liquidation** | Red | Instant kill |

### Important Timings

| Event | Duration |
|-------|----------|
| **Grace Period** | 24 seconds |
| **Buff Duration** | 10 seconds |
| **Debuff Duration** | 5 seconds |
| **Combo Timeout** | 3 seconds |
| **Portal Duration** | 25 seconds |
| **Wave Cycle** | 5 minutes |

---

*Last Updated: February 2026*
*Version: 1.0.0*
