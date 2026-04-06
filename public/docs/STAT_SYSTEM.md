# :BarChart: Stat System

> **Status** live
> Owner: Core Game Design



## Summary

The stat system combines base player values, upgrades, temporary modifiers, leverage pressure, and market-driven difficulty outputs.

The goal is to keep combat readable while still letting the market meaningfully change pacing.

## Runtime layers

**Base player stats**

Core player values such as HP, move speed, damage, attack speed, crit chance, and magnet range start from the player definition and upgrade state.

**Temporary modifiers**

Buffs, debuffs, event effects, and market pressure adjust those values during the run. These modifiers should be treated as runtime overlays, not permanent progression.

**Difficulty-driven pressure**

The live difficulty stack can influence effective stats indirectly through:

- enemy speed and HP multipliers
- damage pressure
- gem and reward multipliers
- leverage-sensitive survival tuning

## Meta progression

Between runs, persistent upgrades are part of the broader profile and meta progression surface.

At the architecture level this means:

- run-time stat mutation happens in client services
- durable progression state is expected to come from the profile and meta progression backend surface
- the game should bootstrap those values before a run starts instead of mutating them ad hoc mid-session

## Design rule

If a stat changes at 60 FPS, keep it in the runtime layer. If it persists across sessions, treat it as backend-owned progression state.
