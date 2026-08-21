# Game V2 Decision Log

Decisions are append-only. A superseding decision references the old ID and
explains migration impact.

| ID | Decision | Reason |
|---|---|---|
| V2-ADR-001 | Build a clean Game V2 runtime rather than refactor the old gameplay runtime in place. | The old runtime contains overlapping authorities and insufficient gameplay foundations. |
| V2-ADR-002 | Keep the production demo on `main` until replacement gates pass. | Development must not remove the current playable product. |
| V2-ADR-003 | Use fixed top-down orthographic presentation in Three.js. | Preserve horde and telegraph readability while improving 3D visuals. |
| V2-ADR-004 | Use auto-target/auto-fire with manual movement, dash, and active abilities. | Concentrate player attention on positioning, timing, and build decisions. |
| V2-ADR-005 | Use four unified ability slots and six passive-stat slots. | Enforce build commitment and prevent every-run omnipotence. |
| V2-ADR-006 | Give every ability exactly three total tiers. | Keep progression legible, bounded, and ability-specific. |
| V2-ADR-007 | Pause simulation for a 13-second three-card slot reveal. | Preserve meaningful choices without allowing indefinite analysis. |
| V2-ADR-008 | Use Convergence to trigger a mandatory authored boss. | Make run length performance-sensitive but bounded and market-independent. |
| V2-ADR-009 | Offer cash-out after every boss; continuing risks the entire unbanked run balance. | Make greed a clear player-owned decision. |
| V2-ADR-010 | Support BTC, ETH, and SOL with locked LONG/SHORT and five leverage modes. | Preserve market identity while keeping the first asset scope bounded. |
| V2-ADR-011 | Resolve leverage through one versioned lethality profile. | Prevent enemy-damage and player-defense changes from multiplying twice. |
| V2-ADR-012 | Map each indicator profile through confirm, hysteresis, cooldown, and rearm states. | Prevent noisy market thresholds from spamming encounters. |
| V2-ADR-013 | Allow one primary encounter plus one support modifier. | Permit expressive combinations without unbounded event queues. |
| V2-ADR-014 | Reuse Railway market/indicator infrastructure only through a canonical adapter. | Preserve working infrastructure without importing legacy gameplay authority. |
| V2-ADR-015 | Keep direct token conversion outside the first vertical slice. | Separate gameplay proof from wallet, economy, security, and legal risk. |
| V2-ADR-016 | Treat the Agent Orchestrator as development infrastructure only. | Live gameplay and production authority must not depend on autonomous agents. |
| V2-ADR-017 | Deliver completed LEGO milestones with resume-safe repository checkpoints. | Large, interrupted work must remain understandable and restartable. |
| V2-ADR-018 | Select Game V2 at the root entry with an exact `/game-v2` lazy boundary. | The V2 route must not initialize legacy providers, debug side effects, or gameplay singletons. |
| V2-ADR-019 | Use direct Three.js with an owned typed-array ECS, RNG, and replay core. | React Three Fiber and external simulation libraries would add a second runtime authority before the core contracts are proven. |
| V2-ADR-020 | Keep `MASTER_PLAN.md` as stable task definitions and `PROGRESS.md` as live execution state. | Resume-safe tracking needs immutable acceptance criteria plus one unambiguous active-task checkpoint. |
| V2-ADR-021 | Resolve exact targeting distance ties by ascending slot order and give `TargetingSystem` no RNG at all, superseding the Task 12 interface line that reserved RNG for tie resolution. | Consuming RNG on geometric ties would make the replay stream depend on enemy positions every tick, so a 1-ULP float change would shift the whole sequence and break the V2-005 state-hash contract; ascending-slot is deterministic, allocation-free, and mutation-testable. |
| V2-ADR-022 | Give `WeaponSystem` ownership of projectile integration, lifetime countdown, and pool return in V2-011, leaving collision, damage, and death to V2-012. | Task 12 already produces `PROJECTILE_LIFETIME_SECONDS`; without an owner the constant is dead config and projectiles never return to the pool, while keeping damage in V2-012 preserves the one-authority rule. |
| V2-ADR-023 | The entity handle encoding `generation * capacity + slot` has exactly one owner, `World.entityIdOf(slot)`; `createEntity` returns through it, `capacity` stays private, and no consumer may re-derive the rule from a component-store length such as `world.masks.length`. | V2-011 re-derived the encoding in `TargetingSystem` and `WeaponSystem`, and `WeaponSystem` fed the re-derived id straight into `destroyEntity`, so any change to the encoding or store layout would have silently destroyed the wrong slot instead of failing loudly. One validating owner makes an out-of-range or retired slot throw `RangeError` at the boundary. |
