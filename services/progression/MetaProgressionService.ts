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
import { GameplayValidator } from '../gameplay/validators';

const DEFAULT_CARD_CHOICE_COUNT = 3;
const QUAD_CARD_CHOICE_COUNT = 4;
const GRACE_EXTENSION_MS = 8_000;
const MIN_DASH_COOLDOWN_MULTIPLIER = 0.4;

class MetaProgressionServiceClass {
  private initialized = false;

  applyVerifiedTransfer(metaShare: number): number {
    const trustedShare = Math.max(0, Math.floor(metaShare));
    if (trustedShare <= 0) return 0;

    useMetaProgressionStore.getState().addMetaCoins(trustedShare);
    EventBus.emit('metaCoinsTransferred', {
      metaShare: trustedShare,
      newBalance: useMetaProgressionStore.getState().metaCoins,
    });

    return trustedShare;
  }

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
    Logger.warn(
      '[MetaProgression] transferRunCoins() is deprecated; apply server-verified metaShare instead',
      { earnedCoins }
    );
    return 0;
  }

  async purchaseUpgrade(id: MetaUpgradeId): Promise<boolean> {
    const store = useMetaProgressionStore.getState();
    const def = META_UPGRADE_REGISTRY[id];
    const currentLevel = store.upgrades[id];

    const preflight = GameplayValidator.validateMetaUpgradePurchase({
      upgradeId: id,
      currentLevel,
      metaCoins: store.metaCoins,
    });
    if (!preflight.valid) {
      Logger.warn('[MetaProgression] Purchase rejected by gameplay validator', {
        id,
        issues: preflight.issues,
      });
      return false;
    }

    const cost = def.costPerLevel[currentLevel];
    if (cost === undefined) return false;

    try {
      const result = await railwayClient.post<{
        upgradeId: string;
        newLevel: number;
        newMetaCoins: number;
        cost: number;
      }>('/api/v1/meta/purchase', { upgradeId: id });

      const serverValidation = GameplayValidator.validateMetaUpgradePurchase({
        upgradeId: id,
        currentLevel,
        metaCoins: store.metaCoins,
        serverNewLevel: result.newLevel,
        serverNewMetaCoins: result.newMetaCoins,
        serverCost: result.cost,
      });
      if (!serverValidation.valid) {
        Logger.warn('[MetaProgression] Purchase server response rejected', {
          id,
          result,
          issues: serverValidation.issues,
        });
        return false;
      }

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
    if (lvl('DASH_COOLDOWN')) {
      p.dashCooldownMultiplier = Math.max(
        MIN_DASH_COOLDOWN_MULTIPLIER,
        1 - lvl('DASH_COOLDOWN') * 0.2
      );
    }

    // Economy
    if (lvl('COIN_MAGNET')) p.magnet += lvl('COIN_MAGNET') * 25;
    if (lvl('LUCK_GENE')) p.luck += lvl('LUCK_GENE') * 3;
    if (lvl('XP_ACCELERATOR')) {
      p.expMultiplier = 1 + lvl('XP_ACCELERATOR') * 0.1;
    }

    // Special
    if (lvl('STARTING_LEVEL_2')) {
      p.level = Math.max(p.level, 2);
    }

    return p;
  }

  getUpgradeLevel(id: MetaUpgradeId): number {
    return useMetaProgressionStore.getState().upgrades[id];
  }

  getCardChoiceCount(): number {
    return this.getUpgradeLevel('QUAD_CARD_CHOICE') > 0
      ? QUAD_CARD_CHOICE_COUNT
      : DEFAULT_CARD_CHOICE_COUNT;
  }

  getStartingLiquidationGraceMs(baseMs: number): number {
    return this.getUpgradeLevel('GRACE_EXTENSION') > 0
      ? Math.max(baseMs, GRACE_EXTENSION_MS)
      : baseMs;
  }

  reset(): void {
    this.initialized = false;
  }
}

export const MetaProgressionService = new MetaProgressionServiceClass();
