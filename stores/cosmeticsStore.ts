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
  encryptedFragments: number;
  setEquippedSkin: (skinId: CharacterSkinId) => void;
  addOwnedSkin: (skinId: CharacterSkinId) => void;
  addEncryptedFragments: (amount: number) => void;
  syncFromServer: (
    owned: CharacterSkinId[],
    equipped: CharacterSkinId,
    encryptedFragments?: number
  ) => void;
  reset: () => void;
};

const normalizeEncryptedFragments = (amount: unknown): number =>
  typeof amount === 'number' && Number.isFinite(amount)
    ? Math.max(0, Math.floor(amount))
    : 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const useCosmeticsStore = create<CosmeticsStore>()(
  persist(
    set => ({
      equippedSkinId: DEFAULT_SKIN_ID,
      ownedSkinIds: [DEFAULT_SKIN_ID],
      encryptedFragments: 0,

      setEquippedSkin: skinId => set({ equippedSkinId: skinId }),

      addOwnedSkin: skinId =>
        set(s =>
          s.ownedSkinIds.includes(skinId)
            ? s
            : { ownedSkinIds: [...s.ownedSkinIds, skinId] }
        ),

      addEncryptedFragments: amount =>
        set(state => {
          const safeAmount = normalizeEncryptedFragments(amount);
          return safeAmount === 0
            ? state
            : { encryptedFragments: state.encryptedFragments + safeAmount };
        }),

      syncFromServer: (owned, equipped, encryptedFragments = 0) =>
        set({
          ownedSkinIds: owned.includes(DEFAULT_SKIN_ID)
            ? owned
            : [DEFAULT_SKIN_ID, ...owned],
          equippedSkinId: equipped,
          encryptedFragments: normalizeEncryptedFragments(encryptedFragments),
        }),

      reset: () =>
        set({
          equippedSkinId: DEFAULT_SKIN_ID,
          ownedSkinIds: [DEFAULT_SKIN_ID],
          encryptedFragments: 0,
        }),
    }),
    {
      name: 'cosmetics-storage',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: persistedState => {
        const state = isRecord(persistedState) ? persistedState : {};
        return {
          ...state,
          encryptedFragments: normalizeEncryptedFragments(state.encryptedFragments),
        } as CosmeticsStore;
      },
    }
  )
);
