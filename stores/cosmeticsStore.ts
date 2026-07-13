/**
 * Cosmetics Store — Zustand + localStorage persistence
 *
 * Persists cosmetic unlock/equip state across sessions (skins are cross-run
 * meta state and intentionally survive gameReset). Runtime resolution for
 * the render loop lives in SkinService; equip validation stays in
 * GameplayValidator. `syncFromServer` is the hook for the future Railway
 * inventory sync (see docs/architecture/SKIN_SYSTEM.md).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type CharacterSkinId } from '../types/lootbox';
import { DEFAULT_SKIN_ID } from '../config/SkinRegistry';

type CosmeticsStore = {
  equippedSkinId: CharacterSkinId;
  ownedSkinIds: CharacterSkinId[];
  setEquippedSkin: (skinId: CharacterSkinId) => void;
  addOwnedSkin: (skinId: CharacterSkinId) => void;
  syncFromServer: (owned: CharacterSkinId[], equipped: CharacterSkinId) => void;
  reset: () => void;
};

export const useCosmeticsStore = create<CosmeticsStore>()(
  persist(
    set => ({
      equippedSkinId: DEFAULT_SKIN_ID,
      ownedSkinIds: [DEFAULT_SKIN_ID],

      setEquippedSkin: skinId => set({ equippedSkinId: skinId }),

      addOwnedSkin: skinId =>
        set(s =>
          s.ownedSkinIds.includes(skinId)
            ? s
            : { ownedSkinIds: [...s.ownedSkinIds, skinId] }
        ),

      syncFromServer: (owned, equipped) =>
        set({
          ownedSkinIds: owned.includes(DEFAULT_SKIN_ID)
            ? owned
            : [DEFAULT_SKIN_ID, ...owned],
          equippedSkinId: equipped,
        }),

      reset: () =>
        set({
          equippedSkinId: DEFAULT_SKIN_ID,
          ownedSkinIds: [DEFAULT_SKIN_ID],
        }),
    }),
    { name: 'cosmetics-storage', storage: createJSONStorage(() => localStorage) }
  )
);
