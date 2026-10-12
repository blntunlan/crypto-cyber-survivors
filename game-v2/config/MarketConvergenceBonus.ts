import { ENEMY_XP_VALUE } from '@/game-v2/config/Mvp0Config';

/**
 * The XP-equivalent value of one "bonus unit" from a completed market
 * encounter (`V2-212`). Reuses `ENEMY_XP_VALUE` — the same real anchor
 * `CONVERGENCE_THRESHOLD` itself is already built from (`Mvp0Config.ts`)
 * — rather than an independently invented bonus rate (V2-ADR-147).
 */
export const MARKET_CONVERGENCE_BONUS_XP_PER_UNIT = ENEMY_XP_VALUE;

/**
 * `WorldEventEncounterOutput` carries no numeric field to scale a bonus
 * by (unlike `LootEventEncounterOutput`'s real `lootValue`), so a
 * completed hazard counts as a flat unit — chosen with stated reasoning,
 * matching `V2-108`/`V2-204`/`V2-205`'s own precedent for an irreducible
 * judgment call (V2-ADR-148); `V2-405` tunes final balance later.
 */
export const WORLD_EVENT_CONVERGENCE_BONUS_UNITS = 1;
