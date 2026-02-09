# Agent Modes: /turbo and /ultrathink

## /turbo (Fast Implementation)
- **Goal**: Rapid feature delivery or prototyping.
- **Rules**:
  - Skip extensive pre-implementation audits.
  - Implement logic directly using standard patterns.
  - Write minimal critical tests (smoke tests).
  - Prioritize "Done" over "Perfect", but MUST remain GC-Free.
  - Brief one-sentence explanations only.

## /ultrathink (Comprehensive Audit & Strict Implementation)
- **Goal**: Production-ready, high-stability code for core systems.
- **Rules**:
  - **Audit First**: Analyze existing services and dependencies.
  - **Memory Check**: Trace every object allocation. Use `PoolManager` even if it seems overkill.
  - **Complexity Audit**: Verify $O(N)$ or better. Use `SpatialGrid` for any proximity-based logic.
  - **Event-Driven**: Ensure NO direct service-to-service calls. Use `EventBus`.
  - **TDD Requirement**: Write comprehensive unit tests (Edge cases, Performance stress) BEFORE implementation.
  - **Lint & Types**: Run `npm run lint` and `tsc` immediately after implementation.
  - **Refactor Hint**: If a component is >300 lines, split it into features/ slices.
