/**
 * useEquippedSkin - Reactive access to the active character skin for UI
 * (hub preview, skin selector). Render-loop code must NOT use this hook;
 * it reads SkinService.getVisuals() directly instead.
 */

import { useSyncExternalStore } from 'react';
import { SkinService } from '../services/skins/SkinService';
import {
  CHARACTER_SKIN_DEFINITIONS,
  type CharacterSkinDefinition,
} from '../types/inventory';
import { type CharacterSkinId } from '../types/lootbox';

export const useEquippedSkin = (): {
  skinId: CharacterSkinId;
  definition: CharacterSkinDefinition;
} => {
  const skinId = useSyncExternalStore(
    callback => SkinService.onChange(callback),
    () => SkinService.getActiveSkinId()
  );

  return { skinId, definition: CHARACTER_SKIN_DEFINITIONS[skinId] };
};
