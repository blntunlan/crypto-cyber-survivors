# Product Definition: Crypto Survivors

## Initial Concept
Crypto Survivors is a high-adrenaline, real-time market-driven survival game that merges live Bitcoin (BTC/USD) price volatility with fast-paced Vampire Survivors-style gameplay. Players must survive waves of enemies whose aggression and power are dictated by the actual crypto markets.

## Target Users
- **Crypto Enthusiasts & Traders:** Users who enjoy market-driven mechanics and seeing real-time price volatility integrated into gameplay.
- **Survival/Roguelite Gamers:** Fans of the Vampire Survivors genre looking for a high-performance, competitive experience with deep progression systems.
- **Web3 & Play-to-Earn Players:** Users interested in wallet integration (Solana), leaderboards, and persistent on-chain profiles.

## Project Goals
- **High-Performance Web Gaming:** Deliver a stable 60 FPS experience on both mobile and desktop browsers using a custom Canvas engine and optimized object pooling.
- **Deep Market Integration:** Create a unique gameplay loop where real-time crypto volatility (BTC/USD) directly dictates game difficulty, enemy aggression, and reward scaling.
- **Competitive Ecosystem:** Build a persistent player base with global leaderboards, multi-provider authentication (OAuth/Web3), and localized content in 8+ languages.

## Core Features
- **Market-Driven Difficulty:** Live price feeds (Binance/Coinbase) affecting spawn rates, enemy speed, and multipliers in real-time.
- **Deep Progression & Customization:** 40+ crypto-themed upgrades (cards), a tiered rarity system, and a stackable buff/debuff decorator system.
- **Multi-Platform Accessibility:** Fully responsive HUD with safe-area support, dual control schemes (Virtual Joystick/Drag-to-Move), and PWA support.
- **Seamless Authentication:** Secure, passwordless entry via Email OTP and Social OAuth (Google, Discord) with aggressive session persistence for PWA users.

## Aesthetic & Design Philosophy
- **Cyber-Finance / Neon Aesthetic:** A high-contrast visual style utilizing neon lasers, grid-based background rendering, and stylized financial indicator visualizations (RSI, ATR) integrated into the game world.
- **Psychological Feedback:** High-impact "slot machine" level-up UX, kill streak combo multipliers, and intense visual feedback (screen shake, crit flashes) to maximize player engagement.
- **Architectural Scalability:** A strictly decoupled service-oriented architecture using Singleton patterns and a type-safe EventBus to allow for rapid performance-first development.
