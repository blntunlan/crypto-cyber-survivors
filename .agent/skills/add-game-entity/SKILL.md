# Add Game Entity Skill

## Description
Guides the process of adding a new game entity (Enemy, Item, etc.) to the project, ensuring all configurations and types are updated correctly.

## When to Use
- When you want to add a new enemy type.
- When you want to add a new collectible or item.
- When defining new game constants.

## Instructions

### Adding a New Enemy
1.  **Update Configuration**:
    -   Open `config/EnemyConfig.ts`.
    -   Add the new enemy name to the `EnemyType` union type.
    -   Add a new entry to the `ENEMY_TYPES` object with properties:
        -   `radius`: Collision size.
        -   `baseHealth`: Starting HP.
        -   `baseSpeed`: Movement speed.
        -   `baseDamage`: Damage to player.
        -   `expValue`, `gemValue`: Rewards.
        -   `spawnWeight`: Rarity (higher = more common).
        -   `color`: Visual fallback or primary color.

2.  **Update Factory (If needed)**:
    -   Check `factories/EnemyFactory.ts` if specific instantiation logic is needed (usually `EnemyConfig` is enough).

3.  **Add Assets**:
    -   If the enemy has a sprite, add it to `assets/` (or equivalent) and reference it. Currently, we may use generated shapes/colors.

### Adding a New Item
1.  **Update Configuration**:
    -   Check `config/GameConfig.ts` or `config/LootConfig.ts` (if exists).
    -   Define the item's effect and probability.

2.  **Update Types**:
    -   Ensure `types.ts` reflects the new entity if it's passed around in the global state.

## Validation
-   Run `npm run test` to ensure no regressions.
-   Start the game (`npm run dev`) and verify the new entity spawns/functions as expected.
