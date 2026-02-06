# 📐 Engineering & Scalability Discipline

This document outlines the architectural standards and development discipline required to maintain **Crypto Survivors** as it scales. Following these rules ensures that new features do not introduce technical debt or performance regressions.

---

## 1. Core Performance Laws (Non-Negotiable)

### 🚀 GC-Free Execution
The main game loop (`GameEngine.tsx`) and any service called during the frame (renderers, physics, AI) must NEVER allocate memory.
- **NO** `new Object()`, `new Array()`, or `[].map/filter`.
- **NO** string concatenations like `stats: ${val}` inside the loop.
- **MANDATORY**: Use the `PoolManager` for any entity that spawns or despawns (Bullets, Particles, Enemies).

### ⚡ O(N) Complexity Logic
Avoid $O(N^2)$ calculations at all costs. 
- Use the **Spatial Hashing (SpatialGrid)** for collision detection and distance checks.
- If you add a new entity type, ensure it is registered in the spatial grid for optimized queries.

---

## 2. Decoupled Architecture

### 📡 Event-Driven Communication
Services should be isolated. Instead of Service A calling a method in Service B, use the `EventBus`.
- **Publisher**: `EventBus.emit(EVENTS.MARKET_CRASH, { data })`
- **Subscriber**: `EventBus.on(EVENTS.MARKET_CRASH, handleCrash)`
This allows you to add or remove systems without breaking entire chains of logic.

### 🧩 Feature-Based Slicing
As the project grows, avoid bloating `services/` and `components/`. Organize by feature:
```text
features/
└── guild-system/
    ├── services/
    ├── components/
    ├── hooks/
    └── types/
```
A feature should be self-contained and easily "pluggable."

---

## 3. Data-Driven Design

### ⚙️ Centralized Configuration
**Magic numbers are forbidden.**
- All balancing data (enemy HP, weapon fire rate, market multipliers) must reside in `config/`.
- The logic should be generic; it should not care *which* weapon it is firing, only the parameters passed from the config.

### 🌍 Localization Integrity
- **English is the Source of Truth.**
- Always use the `sync_locales.cjs` (or equivalent CI check) to ensure consistency across languages.
- Fallback to English values if a translation is missing to avoid `undefined` UI keys.

---

## 4. Reliability & Testing

### 🟢 Test-Driven Development (TDD)
- **70% Global Coverage**: Any new feature must be accompanied by unit tests.
- **Mock External State**: Use MSW for network calls and mock the `EventBus` for service tests.
- **Singleton Reset**: Ensure all services include a `reset()` method for test isolation to prevent state leakage between tests.

### 🛡️ Anti-Cheat & Validation
New game mechanics that affect the score or rewards must be mirrored or validated in the `AntiCheatService` and documented for `Edge Function` validation.

---

## 5. Development Workflow

1.  **Planning**: Check `GEMINI.md` and `SCALABILITY_DISCIPLINE.md` before coding.
2.  **Implementation**: Follow the "Service-First" approach (Logic -> API -> UI).
3.  **Validation**: Run `npm run lint` and `npm test` before every commit.
4.  **Sync**: Ensure `README.md` and `GEMINI.md` are updated with `code-doc-sync`.

---
*Failure to adhere to these standards will result in performance degradation and increased bug frequency.*
