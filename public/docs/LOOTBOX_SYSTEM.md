# :Package: Lootbox and Market Cache System

> **Status** live
> Owner: Core Game Design

Type: run-world rewards and meta inventory
Domain: Market Cache, lootboxes, cosmetics, and consumables

## System Boundaries

The project has two separate reward systems. They share rarity language, but they do not share runtime authority.

| System | Scope | Authority | Result |
|---|---|---|---|
| **Market Cache** | Current game run | Non-singleton `LootCacheSystem`, owned by `GameRuntime` | Guaranteed run reward plus an optional encrypted cosmetic fragment |
| **Meta lootbox** | Player inventory outside the run | `LootboxService`, `LootboxDropCalculator`, and `InventoryService` | Weighted skins, consumables, and inventory items |

`LootboxService` does not spawn, open, resolve, or persist the run-world Market Cache. The Market Cache does not add a stored meta lootbox.

## Market Cache Rules

- A Market Cache is the world `LOOT_CRATE` interactable. Player contact opens it once; bullet damage does nothing.
- Only one cache may be active. Runtime spawns use game-time windows, seeded rarity selection, safe placement, low-health acceleration, and high-pressure deferral.
- Every opening immediately grants at least one positive, smart-selected run reward. Empty results, traps, damage, debuffs, and enemy spawns are not valid outcomes.
- Smart selection considers health, level progress, enemy pressure, the active Overclock Contract, and seeded weighting. Rewards can heal with brief contact protection, grant experience, apply Overclock Contract, or trigger Circuit Breaker crowd control.
- Opening phases advance from elapsed game-time deltas. The continuous update and render paths use no native `setTimeout` or `setInterval`.

## Casino Tiers

The shared card-tier palette gives each rarity a distinct silhouette treatment, color, label, animation strength, and audio finish.

| Market label | Shared rarity | Run reward | Presentation |
|---|---|---|---|
| **Slot Silver** | Common | One reward at 1.0 strength | Silver treatment and short confirmation chime |
| **Electric Blue** | Rare | One reward at 1.25 strength | Blue treatment, shake, and slot-win accent |
| **Royal Purple** | Epic | One reward at 1.6 strength | Purple treatment, stronger shake, sparkle, and slot-win accent |
| **Casino Gold** | Legendary | Two distinct valid rewards at 1.5 strength | Gold jackpot treatment, fanfare, and coin-shower audio |

The jackpot coin-shower is feedback only. It does not credit coins or mutate a wallet.

## Encrypted Fragments

- A fragment roll is optional and additional to the guaranteed run reward; it never replaces gameplay value.
- The first 180 seconds of a run have zero fragment probability. Later probability follows the configured time-and-rarity bands, so higher tiers and longer runs have better odds.
- Eligible misses use run-local soft pity beginning after eight misses, capped at a 10 percentage-point bonus. A successful fragment resets that run-local miss count.
- A normal runtime fragment emits `cosmeticFragmentEarned` and increments `cosmeticsStore.encryptedFragments` by one.
- The cosmetic balance is local-first Zustand persisted state. Missing, invalid, or corrupted fragment data normalizes safely to zero, and server sync can reconcile an authoritative balance when available.
- A Market Cache never grants or unlocks a complete skin. Fragment redemption and crafting remain separate future meta flows.
- A development fragment preview never changes persisted fragment balance, pity, analytics, coins, or wallet state.

## Development Controls

The shortcuts are available only in development while game status is `PLAYING`. Ctrl- or Alt-modified requests are rejected.

| Control | Behavior |
|---|---|
| `B` | Replaces any active cache with a random-rarity debug cache near the player |
| `Shift+B` | Replaces any active cache with a Casino Gold cache and previews the complete jackpot plus fragment reveal |

These controls are presentation tools. Debug openings apply their run reward, but fragment preview persistence stays disabled.

## Feedback And Accessibility

- Spawn, proximity, opening, and rarity-finish audio are event-boundary effects; muted or unavailable audio degrades to visual feedback.
- Rarity remains readable through silhouette treatment, shared tier color, label, ring, and reward feedback rather than color alone.
- Reduced motion removes camera shake and displaced opening pieces. It retains the tier color, rarity ring, floating result label, and permitted audio so the result remains readable.
- Cache contact cannot grant a repeated reward because only the closed active cache can open, and its phase changes immediately before reward resolution.

## Runtime Flow

1. `GameRuntime` constructs one `LootCacheSystem` and resets or disposes it with the run.
2. `GameEngine` updates it before physics using one reused input object and game-time deltas.
3. `CollectionSystem` detects player contact and calls `tryOpen`; `CollisionSystem` ignores bullet contact with `LOOT_CRATE`.
4. `LootCacheRewardResolver` chooses guaranteed run rewards and the optional fragment result.
5. `LootCacheRewardApplicator` mutates run state, while typed `EventBus` events drive feedback and local-first fragment persistence.
6. `EntityRenderer` draws the cache, off-screen marker, tier feedback, and reduced-motion presentation.

## Important Files

- `services/gameplay/loot/LootCacheSystem.ts`
- `services/gameplay/loot/LootCacheRewardResolver.ts`
- `services/gameplay/loot/LootCacheRewardApplicator.ts`
- `services/renderers/EntityRenderer.ts`
- `stores/cosmeticsStore.ts`
- `services/lootbox/LootboxService.ts`
- `services/lootbox/LootboxDropCalculator.ts`
- `services/inventory/InventoryService.ts`

## Documentation Rule

Do not describe old `player_lootboxes`, `player_inventory`, trigger-based persistence, direct coin credit, or complete-skin Market Cache drops as active behavior unless the authoritative Railway schema and routes implement them. This page tracks the live client runtime.
