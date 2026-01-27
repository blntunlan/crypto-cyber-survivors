# 🧪 Project Darwin: Simulation & Training Environment

This directory contains the infrastructure for **Project Darwin**, the AI training and self-play simulation system for Crypto Survivors.

## Directory Structure

### `/headless-engine`
Contains the **Headless Game Engine**. This is a stripped-down version of the main game engine that runs without:
- React / DOM
- Canvas / WebGL
- Audio
- User Input (replaced by Virtual Input)

It is optimized for raw performance, capable of running thousands of game ticks per second for rapid training.

### `/evolution`
Contains the **Genetic Algorithm** logic:
- `Trainer.ts`: The main entry point for training sessions.
- `Genome.ts`: Definition of mutable genes (AI weights, difficulty params).
- `Population.ts`: Manages the pool of candidate brains.
- `Fitness.ts`: The "fun formula" that scores each session.

## Usage

To start a training session (once implemented):

```bash
npm run train:ai
```

## Architecture

The simulation runs in a **Master-Worker** architecture:
1. **Master** creates an initial population of random Neural Networks.
2. **Master** spawns Node.js Worker Threads.
3. **Workers** run `HeadlessGameEngine` with a `DummyAgent` playing the game.
4. **Workers** return a `Fitness Score` (Survival time, stress score, etc.).
5. **Master** selects the best brains, mutates them, and repeats.
