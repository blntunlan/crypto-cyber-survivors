---
description: Standardize Stat Formatting & Raw Data Discipline
---

This workflow establishes the "Raw Data First" discipline across the codebase to prevent redundant formatting bugs (like 1000% crit chance).

## The Core Discipline
1.  **Raw Values Only**: All player stats (baseDamage, critChance, etc.) must remain as "raw" values (`0.05` for 5%) in all services, hooks, and calculations.
2.  **Formatting at Edge**: Formatting (*100, adding icons, fixed decimals) MUST only happen in the final UI components (HUD, Menus) at the moment of rendering.
3.  **Registry Driven**: Use `StatRegistry.ts` flags (`isPercentage`) to decide how to format, rather than hardcoding logic.

## Steps

1.  **Identify Format Leaks** [DONE]
    -   Search for `* 100` and `.toFixed` in the following directories:
        -   `hooks/` (especially `usePlayerState`, `useLerpValues`)
        -   `services/` (especially `CombatSystem`, `BuffManager`)
        -   `components/hud/`
    -   Identify places where stats are being "pre-formatted" before reaching the UI.

2.  **Centralize Formatting Logic** [DONE]
    -   If not already present, create a helper in `utils/FormatUtils.ts` or similar.
    -   Example: `formatStat(value: number, def: StatDefinition): string`.

3.  **Sanitize Logic Layer** [DONE]
    -   Remove any `* 100` or string conversions from:
        -   `GameUI.tsx` (where values are prepared for smoothing).
        -   `BuffManager.ts` (where buffs are calculated).
        -   `useLerpValues.ts` (the lerp should handle raw numbers).

4.  **Enforce UI Formatting** [DONE]
    -   Update `KernelStatus.tsx` to strictly use the `StatRegistry` definition for every stat.
    -   Update card descriptions in `cardDefinitions.ts` to reflect raw values (though descriptions are static strings, ensured they align with logic).

5.  **Verification** [DONE]
    -   Check the HUD: Is Crit % back to normal?
    -   Check the Card selection: Do the values match the description?
    -   Check Tooltips (if any).

6.  **Cleanup** [DONE]
    -   Remove any legacy formatting functions that are no longer used.
    -   Run `npm run lint` to ensure no type mismatches were introduced.
