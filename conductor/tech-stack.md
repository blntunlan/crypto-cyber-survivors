# Tech Stack: Crypto Survivors

## Frontend Core
- **Language:** TypeScript 5.8 (Strict Mode enabled)
- **Framework:** React 19 (latest hooks and concurrent features)
- **Build Tool:** Vite 6 (optimized for fast HMR and production builds)
- **State Management:** Zustand 5 (Modular Slice Pattern for decoupled state)

## Game Engine & Systems
- **Rendering:** Custom Canvas-based engine (GC-free render loop)
- **Physics:** Spatial Grid for O(1) neighbor lookup and collision detection
- **Optimization:** PoolManager for O(1) object recycling (enemies, projectiles, particles)
- **Architecture:** Singleton Service layer with a type-safe EventBus (Observer Pattern)

## Styling & UX
- **Styling:** Tailwind CSS 3 (utility-first UI components)
- **Animations:** Framer Motion 12 (smooth menu transitions and HUD effects)
- **Audio:** Howler.js 2.2 (multi-channel sound management and procedural synthesis)

## Backend & Infrastructure
- **BaaS:** Supabase (PostgreSQL with RLS, Realtime subscriptions, Edge Functions)
- **Hosting:** Railway (Static site hosting and market-logger backend)
- **Market Data:** WebSocket Feeds (Binance & Coinbase Trade streams)

## Quality & Testing
- **Unit/Integration:** Vitest (190+ test suites, 2100+ tests)
- **End-to-End:** Playwright (70+ tests covering mobile and desktop flows)
- **Quality Tools:** ESLint, Prettier, Husky (pre-push hooks)
