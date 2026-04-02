/**
 * MetaProgressionService — Permanent cross-run upgrades
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { railwayClient } from '../api/RailwayClient';
import { useMetaProgressionStore } from '../../stores/metaProgressionStore';
import { META_UPGRADE_REGISTRY } from '../../config/MetaUpgradeRegistry';
import { type MetaUpgradeId, type PlayerMetaState } from '../../types/metaProgression';
import { type Player } from '../../types';

class MetaProgressionServiceClass {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      const state = await railwayClient.get<PlayerMetaState>('/api/v1/meta/state');
      useMetaProgressionStore.getState().syncFromServer(state);
      this.initialized = true;
      EventBus.emit('metaStateLoaded', {
        metaCoins: state.metaCoins,
        upgrades: state.upgrades as Record<string, number>,
      });
    } catch {
      Logger.warn('[MetaProgression] Failed to fetch server state, using local cache');
    }
  }

  async transferRunCoins(earnedCoins: number): Promise<number> {
    const metaShare = Math.floor(earnedCoins * 0.15);
    if (metaShare <= 0) return 0;

    try {
      const result = await railwayClient.post<{
        metaShare: number;
        newMetaBalance: number;
        newTotalEarned: number;
        newRunsCompleted: number;
      }>('/api/v1/meta/transfer', { earnedCoins });
      // Sanity-check server response to prevent inflated credits
      const trustedShare = Math.min(result.metaShare, metaShare * 2);
      useMetaProgressionStore.getState().addMetaCoins(trustedShare);
      EventBus.emit('metaCoinsTransferred', {
        metaShare: trustedShare,
        newBalance: result.newMetaBalance,
      });
      return trustedShare;
    } catch {
      useMetaProgressionStore.getState().addMetaCoins(metaShare);
      EventBus.emit('metaCoinsTransferred', {
        metaShare,
        newBalance: useMetaProgressionStore.getState().metaCoins,
      });
      return metaShare;
    }
  }

  async purchaseUpgrade(id: MetaUpgradeId): Promise<boolean> {
    const store = useMetaProgressionStore.getState();
    const def = META_UPGRADE_REGISTRY[id];
    const currentLevel = store.upgrades[id];

    if (currentLevel >= def.maxLevel) return false;
    if (currentLevel >= def.costPerLevel.length) return false;
    const cost = def.costPerLevel[currentLevel];
    if (cost === undefined || store.metaCoins < cost) return false;

    try {
      const result = await railwayClient.post<{
        upgradeId: string;
        newLevel: number;
        newMetaCoins: number;
        cost: number;
      }>('/api/v1/meta/purchase', { upgradeId: id });

      store.spendMetaCoins(cost);
      store.setUpgradeLevel(id, result.newLevel);
      EventBus.emit('metaUpgradePurchased', { id, newLevel: result.newLevel, cost });
      return true;
    } catch {
      Logger.warn('[MetaProgression] Purchase failed (offline), not applying upgrade');
      return false;
    }
  }

  applyBonuses(player: Player): Player {
    const { upgrades } = useMetaProgressionStore.getState();
    const p = { ...player };

    const lvl = (id: MetaUpgradeId) => upgrades[id];

    // Combat
    if (lvl('DAMAGE_BOOST')) {
      p.baseDamage = Math.round(p.baseDamage * (1 + lvl('DAMAGE_BOOST') * 0.08));
    }
    if (lvl('CRIT_MASTERY')) p.critChance = p.critChance + lvl('CRIT_MASTERY') * 0.05;
    if (lvl('EXTRA_PROJECTILE')) {
      p.projectiles = p.projectiles + lvl('EXTRA_PROJECTILE');
    }

    // Survival
    if (lvl('HP_RESERVOIR')) {
      p.maxHp += lvl('HP_RESERVOIR') * 15;
      p.hp = p.maxHp;
    }
    if (lvl('ARMOR_PLATING')) p.armor += lvl('ARMOR_PLATING');

    // Economy
    if (lvl('COIN_MAGNET')) p.magnet += lvl('COIN_MAGNET') * 25;
    if (lvl('LUCK_GENE')) p.luck += lvl('LUCK_GENE') * 3;

    return p;
  }

  getUpgradeLevel(id: MetaUpgradeId): number {
    return useMetaProgressionStore.getState().upgrades[id];
  }

  reset(): void {
    this.initialized = false;
  }
}

export const MetaProgressionService = new MetaProgressionServiceClass();
