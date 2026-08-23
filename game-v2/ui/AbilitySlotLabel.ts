import { type AbilitySlotReadout } from '@/game-v2/contracts/GameV2Debug';

/**
 * The HUD binding shown for an occupied ability slot (design §5.1,
 * V2-ADR-048): an `active` ability shows its `1`-based slot position, an
 * `auto` ability shows `AUTO`. Derived from the slot's own `index`, never a
 * stored label, so it cannot disagree with `AbilityLoadoutSystem`'s slot
 * order.
 */
export const formatAbilitySlotBinding = (slot: AbilitySlotReadout): string =>
  slot.activation === 'auto' ? 'AUTO' : String(slot.index + 1);
