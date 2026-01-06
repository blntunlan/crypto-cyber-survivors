import { type Player } from '../../types';
import { type Card } from './types';
import { STAT_DEFINITIONS, type StatDefinition } from '../../config/StatRegistry';

/**
 * applyCardEffect - Applies a card's effects to a player object.
 *
 * Supports both declarative 'modifiers' and legacy 'effect' functions.
 * Automatically respects stat caps and constraints defined in StatRegistry.
 *
 * Special handling: When maxHp increases, hp also increases by the same amount
 * to ensure players immediately benefit from health-increasing cards.
 *
 * @param player The current player state
 * @param card The card to apply
 * @returns A new player state with modifications applied
 */
export function applyCardEffect(player: Player, card: Card): Player {
  let nextP = { ...player };
  const previousMaxHp = nextP.maxHp;

  // 1. Apply declarative modifiers
  if (card.modifiers) {
    card.modifiers.forEach(mod => {
      const statName = mod.stat;
      const def = (STAT_DEFINITIONS as Record<string, StatDefinition>)[statName];
      if (!def) return; // Skip if stat not found in registry
      let value = nextP[statName];

      switch (mod.type) {
        case 'add':
          value += mod.value;
          break;
        case 'multiply':
          value *= mod.value;
          break;
        case 'percent':
          value *= 1 + mod.value;
          break;
      }

      // Enforce caps from registry
      // For inverse stats (like fireRate), cap is the minimum allowed value
      if (def.cap !== undefined) {
        if (def.isInverse) {
          value = Math.max(def.cap, value);
        } else {
          value = Math.min(def.cap, value);
        }
      }

      // Enforce minimum values from registry if defined
      if (def.minValue !== undefined) {
        value = Math.max(def.minValue, value);
      }

      nextP[statName] = value;
    });
  }

  // 2. Apply legacy effect function for complex or unique logic
  if (card.effect) {
    nextP = card.effect(nextP);
  }

  // 3. Sync hp with maxHp changes
  // When maxHp increases, hp should also increase by the same amount
  // This ensures players immediately benefit from health-increasing cards
  const maxHpDelta = nextP.maxHp - previousMaxHp;
  if (maxHpDelta > 0) {
    nextP.hp = Math.min(nextP.hp + maxHpDelta, nextP.maxHp);
  } else if (maxHpDelta < 0) {
    // If maxHp decreased, cap hp to new maxHp
    nextP.hp = Math.min(nextP.hp, nextP.maxHp);
  }

  return nextP;
}
