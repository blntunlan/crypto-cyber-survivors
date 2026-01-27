---
description: Proje Darwin - AI Gameplay Optimization & Self-Play Simulation Workflow
---

# 🧬 Project Darwin: AI Gameplay Training Simulation

This workflow establishes a **Headless Simulation Environment** to train the `AIDirector` using genetic algorithms and self-play. This allows the game to automatically balance itself and learn advanced difficulty management strategies.

## 0. Prerequisities

Before running the simulation, we need to create the necessary infrastructure files.

## 1. Create Headless Simulation Infrastructure

We need to decouple the Game Logic from React/Canvas to run it purely in Node.js.

### 1-A. Create `headless-engine` Directory
Create `d:\crypto-cyber-survivors\simulation\headless-engine` to house the headless loop.

```bash
mkdir -p simulation/headless-engine
```

### 1-B. Create `HeadlessGameEngine.ts`
Implement a stripped-down version of GameEngine that:
- Removes all Rendering/Canvas logic
- Removes React hooks/state
- Uses a deterministic `dt` (Delta Time) instead of `requestAnimationFrame`
- Mocks `PoolManager` and `EventBus` for isolated execution
- Exposes `step(dt)` function to advance the world

### 1-C. Create `DummyAgent.ts`
Implement a simple heuristic bot that can play the game without human input:
- **Movement:** Move away from nearest enemy centroid.
- **Combat:** Auto-fire checks from `CombatSystem` (already logic-based).
- **Upgrades:** Randomly select upgrades on LevelUp.

## 2. Implement the Genetic Algorithm (Evolution Loop)

Create `d:\crypto-cyber-survivors\simulation\evolution\Darwin.ts`.

### 2-A. Define the Genome
The `Genome` represents the tunable parameters of the AI:
- `AIDirector` Neural Network Weights (JSON)
- `DifficultyManager` Config Limits (Min/Max spawn rates, etc.)

### 2-B. Define the Fitness Function
How do we score a "Good Game"?
```typescript
function calculateFitness(session: GameSession): number {
    const duration = session.durationSeconds;
    const hpVariance = session.hpStandardDeviation; // Did HP fluctuate? (Excitement)
    const closeCalls = session.nearDeathCount; // "Stress" moments

    if (duration < 30) return 0; // Too hard (Unfair)
    if (duration > 600 && hpVariance < 5) return 0; // Too easy (Boring)

    // Sweet Spot: 5-10 mins, High HP Variance, 2-3 Close Calls
    return duration * (hpVariance * 2) + (closeCalls * 500);
}
```

### 2-C. Create `Trainer.ts`
The main orchestrator that:
1. Spawns N `HeadlessGameEngine` instances (Workers).
2. Assigns a mutated Genome to each.
3. Runs the simulation for X virtual minutes (or until death).
4. Collects Fitness Scores.
5. Selects top 10% -> Crossover -> Mutation -> Next Generation.

## 3. High-Performance Multithreading Setup

To simulate thousands of games quickly, we must use Node.js Worker Threads.

### 3-A. Create `SimulationWorker.ts`
A worker script that takes a `Genome` as input, initializes a `HeadlessGameEngine`, runs a match, and returns the `FitnessScore`.

### 3-B. Configure `npm run train:ai`
Add a script to `package.json`:
`"train:ai": "ts-node simulation/evolution/Trainer.ts"`

## 4. Execution Step (Training)

Once the infrastructure is built, run the training cycle.
**Note:** This is a computationally expensive process.

```bash
# Run 50 Generations with a population of 100
npm run train:ai -- --generations=50 --population=100
```

## 5. Output Integration (The Master Brain)

The Trainer will output a `best-brain-gen-50.json` file.
1. Copy this file to `services/difficulty/brain/pretrained-weights.json`.
2. Update `AIDirector.ts` to load these weights on initialization:

```typescript
import pretrainedWeights from './brain/pretrained-weights.json';
// ...
this.net = Network.fromJSON(pretrainedWeights);
```

## 6. Validation (Human Test)

Play the game with the new brain to verify if the "Constant Game Feel" issue is resolved and if the AI adapts dynamically to player skill.

## 7. Visual Inspector (Laboratory Mode)

To watch the AI learn in real-time, we implement a "Spectator Mode" bridging the Node.js backend and the React frontend.

### 7-A. Inspector Server (Backend)
- Add a WebSocket server (`ws`) to `Trainer.ts`.
- Every generation, stream the `GameSession` inputs/outputs of the **Best Performing Agent** to connected clients.
- Stream Metrics: `FitnessScore`, `Generation`, `AliveCount`, `BestSurvivalTime`.

### 7-B. Spectator Dashboard (Frontend)
- Create a new Admin Route: `/admin/darwin`.
- **Live Graph:** Use `recharts` to plot Fitness History.
- **Replay Renderer:**
  - Create `<SimulationRenderer />` component.
  - Disable Player Input.
  - Listen to WebSocket stream.
  - Override `GameEngine` state with received Simulation Frame Data.

### 7-C. Usage
1. Run Training: `npm run train:ai -- --watch` (starts WS server on port 8080).
2. Open Game: Go to `http://localhost:3000/admin/darwin`.
3. Watch the "Best Bot" from Generation 1 to 50 evolve from a toddler to a pro.

---

> **Darwin's Law:** "It is not the strongest of the species that survives, nor the most intelligent; it is the one most adaptable to change." - Charles Darwin
