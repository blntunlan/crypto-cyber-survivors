# Character Skin System

> **Status**: LIVE | **Version**: v1.0 | **Owner**: Core Game Design

Cosmetic character skins layered on top of the market-position player rendering.
Skins are **cross-run meta state**: they persist across sessions and deliberately
do not participate in the `gameReset` path.

## Design Constraint: The Position Signal Wins

The player body color is the live market-position signal (green LONG / red
SHORT) — a design pillar ("live leveraged position" fantasy). Skins therefore
work as **partial palette overrides**: any layer a skin does not define falls
back to the position color, and `trailColor` / `accentColor` (dash trail, halo
rings) are intentionally never overridden so the LONG/SHORT signal stays
readable with every skin. This invariant is enforced by
`tests/config/SkinRegistry.test.ts`.

## Layers

```
Hub UI (useEquippedSkin hook, skin selector)
    ↕ SkinService.onChange / SkinService.equip()
SkinService (services/skins/) — runtime authority, zero-alloc resolution
    ↕ EventBus: skinEquipped · skinUnlocked · inventoryUpdated
InventoryService (ownership, lootbox unlocks)   SKIN_VISUAL_REGISTRY (config/)
    ↕
cosmeticsStore (stores/cosmeticsStore.ts) — Zustand + localStorage persistence
```

| Piece | File | Owns |
| --- | --- | --- |
| Identity metadata | `types/inventory.ts` (`CHARACTER_SKIN_DEFINITIONS`) | name, icon, rarity, unlock method |
| Visual palette | `config/SkinRegistry.ts` (`SKIN_VISUAL_REGISTRY`) | render-facing colors (6-digit hex only) |
| Visual types | `types/skins.ts` | `SkinVisualDefinition`, `ResolvedSkinVisuals` |
| Persistence | `stores/cosmeticsStore.ts` | `equippedSkinId`, `ownedSkinIds` (localStorage) |
| Runtime authority | `services/skins/SkinService.ts` | active skin, resolved visuals, equip validation |
| Render integration | `services/renderers/EntityRenderer.ts` | consumes `SkinService.getVisuals(player.color)` |
| React access | `hooks/useEquippedSkin.ts` | reactive skin id + definition for UI |

## Hot-Path Contract (60 FPS)

`SkinService.getVisuals(positionColor)` returns **one pre-allocated
`ResolvedSkinVisuals` struct**, recomputed in place only when the equipped skin
or the position color changes. `EntityRenderer.drawPlayer` calls it once per
frame with `player.color` — zero allocations, no event traffic in the loop.
Do not retain or copy the struct across frames.

All registry colors must be 6-digit hex (`#RRGGBB`) because renderers append
alpha suffixes (`` `${color}25` ``) for cached gradients.

## Equip & Unlock Flow

Both equip paths converge on the `skinEquipped` event; `SkinService` is the
single activation point (it also persists to `cosmeticsStore`):

- **`SkinService.equip(id)`** — hub UI path. Ownership validated against the
  persisted `cosmeticsStore.ownedSkinIds` via
  `GameplayValidator.validateSkinEquip`.
- **`InventoryService.equipSkin(id)`** — legacy in-memory inventory path
  (lootbox session flow). Validated against `InventoryService` ownership.

Unlocks (`skinUnlocked`, `inventoryUpdated` with `character_skin`/`unlock`)
are mirrored into `cosmeticsStore.ownedSkinIds`, so lootbox drops survive a
reload even though `InventoryService` itself is in-memory only.

On boot, `SkinService` hydrates the persisted equipped skin and re-validates
ownership — editing localStorage cannot equip an unowned skin (falls back to
`default`).

## Adding a New Skin

1. Add the id to `CharacterSkinId` (`types/lootbox.ts`).
2. Add identity metadata to `CHARACTER_SKIN_DEFINITIONS` (`types/inventory.ts`).
3. Add the palette to `SKIN_VISUAL_REGISTRY` (`config/SkinRegistry.ts`) —
   6-digit hex only; leave `trailColor`/`accentColor` unset.
4. `tests/config/SkinRegistry.test.ts` enforces completeness automatically.

## Known Gaps / Future Work

- **Server sync**: `cosmeticsStore.syncFromServer(owned, equipped)` is the
  entry point for a future Railway inventory sync. Until then, ownership is
  client-persisted only — acceptable because skins are purely cosmetic and
  carry no gameplay stats (no anti-cheat surface).
- **`InventoryService.setPlayer` is not called in production** (only tests),
  so its in-memory ownership starts empty each session; the cosmetics store
  is the source that actually survives. When auth binding lands, hydrate
  `InventoryService` from the server and reconcile via `syncFromServer`.
- Hub components (`HubMenu`, `HubMenuV2`) still read
  `InventoryService.getEquippedSkin()` non-reactively; migrate them to
  `useEquippedSkin()` when the skin selector UI is built.
- Sprite-sheet skins: `CharacterSkinDrop.spriteSheet` is reserved; the
  registry can grow a `sprite` field later without touching the service API.
