# Lootbox and Inventory System

Status: live
Type: rewards and inventory runtime
Domain: loot, cosmetics, and consumables

## Summary

The lootbox layer is currently implemented as a service-driven reward system centered on `LootboxService`, `InventoryService`, and `LootboxDropCalculator`.

It supports:

- earning boxes from gameplay milestones
- opening boxes into skins, consumables, and token-like reward items
- applying inventory updates through typed events instead of direct UI coupling

## Runtime flow

1. Gameplay events such as cycle completion, kill streaks, or market-aligned drops award a box.
2. `LootboxService` records the box under the active player context.
3. Opening the box runs weighted drop selection through `LootboxDropCalculator`.
4. Resulting items are handed to `InventoryService` through `EventBus` events.
5. UI surfaces react to inventory and lootbox events without owning the reward logic.

## Current state boundaries

- Lootbox and inventory state are currently service-owned and local-first in the client runtime.
- Drop chance can be influenced by difficulty outputs such as `lootboxDropChance` and trend alignment.
- Durable backend inventory contracts should be documented only when the live route and schema are authoritative.

## Important services

- `services/lootbox/LootboxService.ts`
- `services/lootbox/LootboxDropCalculator.ts`
- `services/inventory/InventoryService.ts`
- `services/difficulty/UnifiedDirector.ts`

## Documentation rule

Do not describe old `player_lootboxes`, `player_inventory`, or trigger-based persistence as active unless the current Railway backend owns those tables and routes. This page tracks the live client runtime only.
