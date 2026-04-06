# 🗺️ Background and Visual Ambience Roadmap

This document has been updated to more effectively reflect market data (RSI, Volume, ATR) in the visuals of "Crypto Cyber Survivors" and to deepen the atmosphere.

## 🟢 Phase 1: Visual Depth and Basic Indicators (Short Term)

- [ ] **Candle Anti-Overlap**: A distribution algorithm that prevents candles in the background from overlapping on the X-axis.
    - *Technical Detail*: Minimum distance check for `x` coordinates within `BackgroundRenderer`.
- [ ] **Parallax Layers**: Realistic sense of movement with 3 different depth layers (Far, Middle, Near).
- [x] **RSI Based Color Toning (Subtle Tint)**: Slight tinting of the screen based on RSI status (Oversold/Overbought). (To be improved: made sensitivity-aware).
- [ ] **Position-Aware Indicator Mapping**: Changing the screen tint not just based on RSI, but based on whether the market is *favorable/unfavorable* to the player's position (LONG/SHORT).
    - *Rule*: "Safety Aura" (Blue/Green) if the position is favorable, "Danger Aura" (Red/Orange) if unfavorable.

## 🟡 Phase 2: Dynamic Market Interactions (Medium Term)

- [ ] **Volatility Pulse (ATR)**: Pulsing of the background grid and neon lines according to the ATR increase in `DifficultyManager`.
    - *Link*: "Chaos Mode" effects when `spawnRateMultiplier` exceeds 2.0.
- [ ] **Whale Warning System**: Visual warnings that appear when `whaleTier` from the server is 1/2/3.
    - [ ] **Radar Effect**: Edge indicators showing the direction from which the whale will spawn.
    - [ ] **Localized Cooldown Visuals**: "Market Cooling" detail at the edge of the screen during the `VolumeAnalyzer` cooldown after a whale spawn.
- [ ] **Combat-React**: Vibration or color ripples in the background when the player lands a Super Crit.

## 🔴 Phase 3: Atmospheric and Tactical Details (Long Term)

- [ ] **Vignette & Scanlines**: Premium Cyberpunk look with darkening at the screen edges and nostalgic scanlines.
- [ ] **Volatility Particles**: Rising or falling dollar/bitcoin symbols depending on the market direction.
- [ ] **Flash Crash / Moon Event**: Instant whitening or inversion of the entire background during very sharp price movements (Shockwave).
- [ ] **Adaptive Noise**: The background becoming more "stressed" (jittery) and animated as the game gets harder and volatility increases.

---

*This roadmap aims to provide an ambience that gives tactical advantages to the player by deepening the integration between MarketIndicatorService and SpawnSystem.*

// END OF PROTOCOL
