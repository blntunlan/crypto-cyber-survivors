# 🎮 Market-Driven Core Game Loop V3 — Implementation Status

> **Status:** Phase 1 & Phase 2 Complete  
> **Date:** 2025-02-19

---

## Architecture Summary

The static difficulty system has been replaced with a dynamic, market-driven core loop built on **3 pillars** that work together to create a visceral trading experience.

---

## ✅ Implemented Systems

### Pillar 1: LeverageEngine (`services/gameplay/LeverageEngine.ts`)

**Purpose:** Continuous, volatility-aware leverage scaling.

| Output | Formula Basis | 1x | 10x | 50x | 100x |
|--------|---------------|-----|------|------|------|
| Damage Taken | log2 + volatility × PnL | 1.0x | 2.0x | 2.7x | **3.0x** |
| XP Gain | √leverage | 1.3x | 1.95x | 3.1x | **4.0x** |
| Spawn Rate | linear + PnL pressure | 0.8x | 3.2x | 5.0x | **5.8x** |
| Enemy Speed | log2 curve | 0.8x | 1.5x | 2.1x | **2.3x** |
| Gem Value | linear + PnL boost | 1.02x | 1.2x | 2.0x | **3.0x** |

**Integration Points:**
- `CollisionSystem.ts`: Player damage × `damageTaken` multiplier
- `CollectionSystem.ts`: Gem value × `gemValue` and XP × `xpGain`
- `DifficultyContext.ts`: Blended 70/30 with static tiers for spawn/speed/HP/damage

### Pillar 2: PriceMomentumEngine (`services/market/PriceMomentumEngine.ts`)

**Purpose:** Every price tick is immediately felt in gameplay.

| Phase | Speed | Spawns | Intensity | Feel |
|-------|-------|--------|-----------|------|
| STAGNANT | 0.7x | 0.5x | 0.1 | Calm breathing room |
| DRIFTING | 0.9x | 0.8x | 0.3 | Gentle drift |
| TRENDING | 1.2x | 1.2x | 0.6 | Flow state territory |
| SURGING | 1.6x | 2.0x | 0.85 | Adrenaline rush |
| CRASHING | **2.5x** | **3.5x** | **1.0** | Maximum chaos |

**Position-Aware Feedback:**
- LONG + price ↑ = enemies 20% slower, gems +50%
- LONG + price ↓ = enemies 50% faster, gems -30%
- (Inverse for SHORT)

**Integration Points:**
- `CoreGameplayLoop.ts`: Blended into spawn/speed multipliers (40/35/25 weight)
- `CoreGameplayLoop.ts`: Phase duration compression (high intensity = shorter phases)
- `GameEngine.tsx`: Background candle speed amplified by intensity
- `GameRenderer.ts`: Background parallax drift driven by price velocity
- `CollectionSystem.ts`: Gem value × `gemValueMod` (position-aware)

### Core Game Loop Integration (`CoreGameplayLoop.ts`)

**Changes:**
- Blends flow state corrections (60-75%) with momentum multipliers (25-40%)
- Phase durations compressed by market intensity (up to 35% shorter)
- Player pulse breathing effect amplified by market intensity
- New outputs: `marketIntensity` (0-1), `suggestedBPM` (80-180)

### Event System (`types/events.ts`)

**New Event:** `priceMomentumUpdate`
- Payload: `{ phase, intensity, direction, suggestedBPM, isFavorable }`
- Emitted on every price tick for cross-system communication

---

## 📊 Complete Data Flow

```
WebSocket → MarketService → EventBus('gameMarketUpdate')
                                       ↓
                    ┌──────────────────┼──────────────────────┐
                    ↓                  ↓                      ↓
          DifficultyContext    PriceMomentumEngine      LeverageEngine
          (factors + tiers)   (phases + multipliers)   (damage + XP)
                    ↓                  ↓                      ↓
                    ↓          CoreGameplayLoop               ↓
                    ↓     (blends flow + momentum)            ↓
                    ↓                  ↓                      ↓
              SpawnSystem        Physics/Speed          CollisionSystem
              (spawn rate)       (enemy speed)          (player damage)
                    ↓                  ↓                      ↓
              EntityRenderer    BackgroundRenderer     CollectionSystem
              (enemies)        (candle parallax)       (XP + gem value)
```

---

## 🔮 Phase 3: Planned (Not Yet Implemented)

### 3A. Dynamic Audio (SynthEngine)
- Use `suggestedBPM` to modulate music tempo
- Use `marketIntensity` for audio filter effects (low-pass in calm, high-pass in chaos)
- Phase-specific ambient tones

### 3B. Indicator Spawn Director (Pillar 3)
- RSI Oversold → "Bear Swarm" (clustered fast enemies)
- MACD Bullish Cross → "Momentum Wave" (directional line formation)
- Bollinger Squeeze → "Tension Build" (slow build → burst spawn)
- New enemy types: `momentum_rider`, `squeeze_bot`, `golden_sentinel`

### 3C. Visual Intensity Overlay
- Market intensity → screen vignette color shifts
- Phase transitions → brief screen flash effects
- CRASHING phase → chromatic aberration / screen distortion

---

## 📂 Files Modified

| File | Change |
|------|--------|
| `services/gameplay/LeverageEngine.ts` | **NEW** — Dynamic leverage scaling engine |
| `services/market/PriceMomentumEngine.ts` | **NEW** — Price tick → gameplay engine |
| `services/difficulty/DifficultyContext.ts` | Import LeverageEngine, blend multipliers |
| `services/gameplay/CoreGameplayLoop.ts` | Import PriceMomentumEngine, blend multipliers |
| `services/combat/physics/CollisionSystem.ts` | Apply leverage damage multiplier |
| `services/combat/physics/CollectionSystem.ts` | Apply leverage XP + gem multipliers |
| `services/renderers/GameRenderer.ts` | Pass momentum through to background |
| `components/GameEngine.tsx` | Feed PriceMomentumEngine, drive background |
| `types/events.ts` | Add priceMomentumUpdate event |
| `docs/MARKET_DRIVEN_GAMELOOP_V3.md` | This document |
