# 🧪 Project Darwin: Simulation & Training Environment

This directory contains the infrastructure for **Project Darwin**, the AI training and self-play simulation system for Crypto Survivors.

## Directory Structure

### `/headless-engine`
Contains the **Headless Game Engine**. This is a stripped-down version of the main game engine that runs without:
- React / DOM
- Canvas / WebGL
- Audio
- User Input (replaced by Virtual Input)

**Key Files:**
- `HeadlessGameEngine.ts` - Core simulation loop with player, enemies, bullets, gems
- `VirtualInput.ts` - Programmatic input simulation for AI agents

It is optimized for raw performance, capable of running thousands of game ticks per second for rapid training.

### `/evolution`
Contains the **Genetic Algorithm** logic:
- `Trainer.ts`: The main entry point for training sessions (Master process).
- `Genome.ts`: Definition of mutable genes (Neural Network + difficulty params).
- `SimulationWorker.ts`: Worker thread that runs individual simulations.
- `Fitness.ts`: Market-aware scoring system for fitness evaluation.

### `/data` (NEW)
Contains **Market Data Integration** for realistic training:
- `HistoricalDataLoader.ts`: Fetches real price/volume data from Supabase.
- `MarketSimulator.ts`: Simulates market conditions (bull/bear/sideways/crash).

## Neural Network Architecture

- **Inputs (16):**
  - 8 raycast distances (enemy detection)
  - 2 gem direction (nearest gem x, y)
  - 2 player stats (HP ratio, XP ratio)
  - 4 market inputs (RSI, ATR%, volume, trend)
- **Hidden Layer:** 12 neurons
- **Outputs (3):** Move X, Move Y, (reserved for dash)

## Market-Aware Training

The AI is trained with realistic market conditions:

| Scenario | Description | Difficulty |
|----------|-------------|------------|
| `calm_bull` | Steady uptrend, low volatility | Easy |
| `aggressive_bear` | Sharp downtrend, high selling pressure | Hard |
| `sideways_chop` | Range-bound, fake breakouts | Medium |
| `flash_crash` | Sudden violent drop | Very Hard |
| `parabolic_pump` | Explosive upward move with FOMO | Hard |
| `dead_market` | Very low volume, minimal movement | Easy |

## Fitness Formula (Market-Aware)

```typescript
baseScore = survivalTime * 10 
          + kills * 5 
          + level * 50 
          + damageDealt * 0.1 
          + gemsCollected * 2

marketBonus = bullKills * 3 * 1.2
            + bearKills * 5 * 1.5      // Bear market harder = more reward
            + highVolSurvival * 15 * 2.0  // High volatility survival bonus
            + whaleEncounters * 10

efficiency = kills / survivalTime
finalScore = (baseScore + marketBonus) * (1 + efficiency * 0.1)
```

## Usage

### Basic Training
```bash
npm run train:ai           # Train with synthetic market scenarios
npm run train:ai -- --watch  # With WebSocket visualization (ws://localhost:8080)
```

### Training with Historical Data
```typescript
// In Trainer.ts, use HistoricalDataLoader:
const loader = new HistoricalDataLoader();
const data = await loader.fetchRecentData('BTC-USD', 60); // Last 60 minutes
const segments = loader.segmentByMarketCondition(data);
```

## Architecture

The simulation runs in a **Master-Worker** architecture:
1. **Master** creates an initial population of random Neural Networks.
2. **Master** spawns Node.js Worker Threads (4 parallel by default).
3. **Workers** run `HeadlessGameEngine` with Neural Network + `MarketSimulator`.
4. Each worker gets a random market scenario (bull/bear/crash/etc.).
5. **Workers** return a `Fitness Score` including market-specific bonuses.
6. **Master** selects top 10% performers, mutates them, and repeats.
7. **Checkpoints** are saved every 10 generations to `services/difficulty/brain/`.

## Supabase Integration

The system can fetch real market data from Supabase `price_history` table:

```sql
-- price_history schema
CREATE TABLE price_history (
  timestamp TIMESTAMPTZ PRIMARY KEY,
  pair TEXT NOT NULL,
  price NUMERIC NOT NULL,
  volume NUMERIC,
  metadata JSONB
);
```

Set environment variables:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## Configuration

Edit constants in `Trainer.ts`:
- `POPULATION_SIZE`: Number of genomes per generation (default: 50)
- `GENERATIONS`: Total training generations (default: 50)
- `WORKER_COUNT`: Parallel worker threads (default: 4)

Edit constants in `SimulationWorker.ts`:
- `SIMULATION_DURATION_SECONDS`: Max game time per genome (default: 60)

Edit scenarios in `MarketSimulator.ts`:
- `TRAINING_SCENARIOS`: Pre-defined market conditions for training variety

---

## AIDirector Training

Separate from the player brain, there's a **Director Brain** that controls game difficulty.

### Training Director Brain
```bash
npx tsx simulation/evolution/DirectorTrainer.ts
```

### Director Architecture
- **Inputs (9):**
  - RSI, MACD, ATR%, Volume, Trend (market)
  - Stress, PlayerDPS, KillEfficiency, ZoningScore (player)
- **Hidden Layer:** 6 neurons
- **Outputs (3):** SpawnDensity, EnemySpeedMod, Aggression

### Director Fitness
Optimizes for "flow state" - keeping player engaged:
- **Ideal Stress:** 35-45% (not too safe, not too panicked)
- **Variance Bonus:** Some tension swings are good
- **Survival Weight:** Longer games = better balance

### Loading in Production
```typescript
// In game initialization
import { loadDirectorBrain } from './services/difficulty/BrainLoader';

// Attempt to load trained brain
await loadDirectorBrain();
```

---

## Output Files

After training, brains are saved to `services/difficulty/brain/`:

| File | Purpose |
|------|---------|
| `brain-FINAL.json` | Trained player movement brain (16-12-3) |
| `director-FINAL.json` | Trained difficulty director brain (9-6-3) |
| `brain-*.json` | Player brain checkpoints |
| `director-*.json` | Director brain checkpoints |
