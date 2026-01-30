# 🧠 AI Director Architectural Design (Neuro-Dynamic Difficulty) v2

> **Status:** Approved (Engineering Plan)
> **Goal:** Invert the static `WavePhase` system into a "Live" director responsive to market and player data, based on Machine Learning (Synaptic.js).

This document re-envisions the game's difficulty and atmosphere management on the axis of **"Market Sentiment + Player Stress."**

---

## 1. Vision: "Game Director" vs "Timeline"

The old system (`WavePhase`) was like a music player; the song changed at minute 3:00. The new system (**AI Director**) will be like a DJ; looking at the vibe of the crowd (the market and the player) and changing the music in real-time.

### Core Change
- **Old:** `Time -> WaveConfig -> Output`
- **New:** `(Price Action + Player State) -> Neural Network -> Output`

---

## 2. Neural Topology

The system will use a lightweight, browser-based **Feed-Forward Neural Network**. Feed-Forward was chosen over LSTM initially (lighter and faster), with a potential transition to LSTM if needed.

**Structure:** `[Input: 8] -> [Hidden: 16] -> [Output: 5]` (Broad single layer, or 2-layer `8 -> 12 -> 8 -> 5` will be tested).

### A. Inputs (Sensors) [Normalized 0.0 - 1.0]

The 8 primary senses through which the AI perceives the world:

1.  **📊 Market Sentiment (RSI):**
    *   Is the market in "Overbought" or "Panic" (Oversold) mode?
2.  **🌪️ Market Chaos (ATR):**
    *   What is the volatility status? (Game Speed).
3.  **📉 Trend Strength (MACD):**
    *   **Dynamic Normalization:** `tanh(macd / (macdRange * 0.5))`
    *   Shows the driving force behind the trend, rather than just price direction.
4.  **⚡ Risk Factor (Leverage):**
    *   Player's leverage ratio (1x - 100x).
5.  **💰 PnL Status:**
    *   Profit/Loss status (-1.0 Loss, +1.0 Profit).
6.  **💓 Player Stress Score (Temporal):**
    *   `stress = (DamageRate_5sec * 0.6) + (DashFrequency * 0.3) + (NearDeathDuration * 0.1)`
    *   Based on "hit rate" over the last 5 seconds rather than instant damage.
7.  **🛡️ Zone Control:**
    *   How much of the map can the player control?
8.  **⏳ Cycle Progression:**
    *   Base difficulty factor that increases as game time progresses.

### B. Outputs (Actuators)

The AI sends these 5 parameters to the game engine (0.0 - 1.0), applied via **Linear Interpolation**:

1.  **Spawn Density:** How many enemies will be on screen simultaneously?
2.  **Enemy Speed modifier:** Adrenaline speed added on top of base speed.
3.  **Elite Probability:** Chance of triggering Whale, Liquidator, or Special events.
4.  **Aggression:** Enemy tracking intelligence and bullet frequency.
5.  **Atmosphere Darkening:** Screen darkening, music tempo, visual "Fear" level.

---

## 3. The Loop Frequency

"Perception" and "Decision" loops are separated for Performance and Game Feel balance:

*   **Sensor Update (200ms):**
    *   All inputs (Stress, MACD, ATR) are updated quickly.
*   **Brain Decision (800ms):**
    *   Neural network runs and new `TargetOutput` is determined.
*   **Actuator Interpolation (Every Frame):**
    *   `CurrentOutput` slides smoothly towards `TargetOutput` (Lerp), preventing sudden difficulty jumps.

---

## 4. Training Strategy (Continuous Bias Training)

We will train the AI with continuous data rather than just 0 and 1 extremums.

### Training Data Set Examples
```javascript
const trainingData = [
  // Scenario: Market Crash + High Leverage (Panic)
  { input: { macd: -0.8, leverage: 1.0 }, output: { aggression: 0.9, density: 1.0 } },
  // Scenario: Slight Dip + Medium Leverage (Tension)
  { input: { macd: -0.3, leverage: 0.5 }, output: { aggression: 0.5, density: 0.6 } },
  // Scenario: Sideways Market + Relaxed Player (Boredom)
  { input: { atr: 0.1, stress: 0.1 }, output: { eliteProb: 0.4 } }, // Inject surprise
];
```

### Adaptive Learning (Fine-Tuning)
If during the game:
*   `PlayerStress < 0.2` (Too easy) AND `BrainAggression > 0.8` (Trying to make it hard)
*   **Result:** AI failed.
*   **Action:** Increase weights for this specific condition in memory (Self-Correction).

---

## 5. Migration Roadmap

### Phase 1: Infrastructure
1.  Initialize `synaptic.js` dependency.
2.  Add normalized **MACD (12, 26, 9)** calculation to `DifficultyContext`.
3.  Implement **Temporal Stress Score** logic in `PlayerStats` module.

### Phase 2: Brain Transplant
4.  Create `AIDirector.ts` class (Neural Network management).
5.  Monitor outputs in the console via Shadow Mode.

### Phase 3: Activation
6.  Deactivate the `WavePhase` system.
7.  Bind AI outputs to `SpawnSystem` parameters.

---

// END OF PROTOCOL
