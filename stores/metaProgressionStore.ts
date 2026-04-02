/**
 * Meta Progression Store — Zustand + localStorage persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type MetaUpgradeId, type PlayerMetaState } from '../types/metaProgression';
import { META_UPGRADE_REGISTRY } from '../config/MetaUpgradeRegistry';

const initialUpgrades = Object.fromEntries(
  Object.keys(META_UPGRADE_REGISTRY).map(k => [k, 0])
) as Record<MetaUpgradeId, number>;

interface MetaProgressionStore extends PlayerMetaState {
  addMetaCoins: (amount: number) => void;
  spendMetaCoins: (amount: number) => void;
  setUpgradeLevel: (id: MetaUpgradeId, level: number) => void;
  syncFromServer: (state: PlayerMetaState) => void;
  reset: () => void;
}

export const useMetaProgressionStore = create<MetaProgressionStore>()(
  persist(
    set => ({
      metaCoins: 0,
      upgrades: { ...initialUpgrades },
      totalRunsCompleted: 0,
      totalMetaCoinsEarned: 0,

      addMetaCoins: amount =>
        set(s => ({
          metaCoins: s.metaCoins + amount,
          totalMetaCoinsEarned: s.totalMetaCoinsEarned + amount,
        })),

      spendMetaCoins: amount =>
        set(s => ({
          metaCoins: Math.max(0, s.metaCoins - amount),
        })),

      setUpgradeLevel: (id, level) =>
        set(s => ({
          upgrades: { ...s.upgrades, [id]: level },
        })),

      syncFromServer: serverState =>
        set({
          metaCoins: serverState.metaCoins,
          upgrades: serverState.upgrades,
          totalRunsCompleted: serverState.totalRunsCompleted,
          totalMetaCoinsEarned: serverState.totalMetaCoinsEarned,
        }),

      reset: () =>
        set({
          metaCoins: 0,
          upgrades: { ...initialUpgrades },
          totalRunsCompleted: 0,
          totalMetaCoinsEarned: 0,
        }),
    }),
    { name: 'meta-progression-storage', storage: createJSONStorage(() => localStorage) }
  )
);
