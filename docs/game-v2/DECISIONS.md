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
