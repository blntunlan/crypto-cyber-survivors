/**
 * LootboxService - Core lootbox management service
 *
 * Handles lootbox earning, opening, and reward distribution.
 * Integrates with InventoryService for item storage.
 */

import { EventBus } from '../EventBus';
import { Logger } from '../Logger';
import { dropCalculator } from './LootboxDropCalculator';
import {
  type LootboxType,
  type LootboxRarity,
  type LootboxSource,
  type PlayerLootbox,
  type LootboxOpenResult,
  type LootboxDrop,
  LOOTBOX_CONFIGS,
  DEFAULT_EARN_CONFIG,
} from '../../types/lootbox';

/**
 * LootboxServiceClass - Internal implementation for managing rewards
 */
class LootboxServiceClass {
  // In-memory storage (will be synced with Supabase later)
  private playerLootboxes: Map<string, PlayerLootbox[]> = new Map();
  private currentPlayerId: string | null = null;
  private sessionFlags: Set<string> = new Set();

  constructor() {
    // Subscribe to game reset
    EventBus.subscribe('gameReset', () => this.handleGameReset());
  }

  /**
   * Sets the current player context for storing boxes.
   *
   * @param playerId Unique identifier for the player
   */
  public setPlayer(playerId: string): void {
    this.currentPlayerId = playerId;
    if (!this.playerLootboxes.has(playerId)) {
      this.playerLootboxes.set(playerId, []);
    }
    Logger.info(`[LootboxService] Player set: ${playerId}`);
  }

  /**
   * Returns the ID of the currently active player.
   */
  public getCurrentPlayerId(): string | null {
    return this.currentPlayerId;
  }

  /**
   * Awards a lootbox of a specific type to the current player.
   *
   * @param boxType The category of box (e.g., 'mining_crate')
   * @param source The gameplay event that triggered the reward
   * @returns The newly created box object, or null if no player is set
   */
  public earnLootbox(
    boxType: LootboxType,
    source: LootboxSource
  ): PlayerLootbox | null {
    if (!this.currentPlayerId) {
      Logger.warn('[LootboxService] No player set, cannot earn lootbox');
      return null;
    }

    const config = LOOTBOX_CONFIGS[boxType];

    const lootbox: PlayerLootbox = {
      id: this.generateId(),
      playerId: this.currentPlayerId,
      boxType,
      rarity: config.rarity,
      obtainedAt: new Date(),
      opened: false,
      source,
    };

    const playerBoxes = this.playerLootboxes.get(this.currentPlayerId) ?? [];
    playerBoxes.push(lootbox);
    this.playerLootboxes.set(this.currentPlayerId, playerBoxes);

    // Emit event with type safety
    EventBus.emit('lootboxEarned', {
      playerId: this.currentPlayerId,
      boxType,
      rarity: config.rarity,
      source,
    });

    Logger.info(
      `[LootboxService] Earned ${config.name} (${config.rarity}) from ${source}`
    );

    return lootbox;
  }

  /**
   * Automatically awards rewards based on cycle completion milestones.
   *
   * @param cycleNumber Number of completed cycles
   */
  public awardCycleReward(cycleNumber: number): PlayerLootbox | null {
    const config = DEFAULT_EARN_CONFIG.cycleRewards;

    let boxType: LootboxType;
    if (cycleNumber >= 5) {
      boxType = config[5];
    } else if (cycleNumber === 3) {
      boxType = config[3];
    } else if (cycleNumber === 2) {
      boxType = config[2];
    } else {
      boxType = config[1];
    }

    return this.earnLootbox(boxType, 'cycle_complete');
  }

  /**
   * Checks for wave-based milestone rewards.
   *
   * @param waveNumber Current game wave
   */
  public checkWaveMilestone(waveNumber: number): PlayerLootbox | null {
    const { interval, chance, boxType } = DEFAULT_EARN_CONFIG.waveMilestone;

    if (waveNumber % interval !== 0) {
      return null;
    }

    if (Math.random() * 100 > chance) {
      Logger.debug(`[LootboxService] Wave ${waveNumber} milestone - no drop (RNG)`);
      return null;
    }

    return this.earnLootbox(boxType, 'wave_milestone');
  }

  /**
   * Awards lootboxes for reaching specific kill streaks.
   *
   * @param streak Current consecutive kill count
   */
  public checkKillStreakReward(streak: number): PlayerLootbox | null {
    const config = DEFAULT_EARN_CONFIG.killStreak;
    const milestones = [500, 250, 100] as const;

    for (const milestone of milestones) {
      if (streak >= milestone) {
        const key = `streak_${milestone}_awarded`;
        if (this.hasSessionFlag(key)) {
          continue;
        }

        this.setSessionFlag(key);
        return this.earnLootbox(config[milestone], 'kill_streak');
      }
    }

    return null;
  }

  /**
   * Processes the opening of a lootbox and calculates rewards.
   *
   * @param lootboxId Unique ID of the box to open
   */
  public async openLootbox(lootboxId: string): Promise<LootboxOpenResult | null> {
    if (!this.currentPlayerId) {
      Logger.warn('[LootboxService] No player set');
      return null;
    }

    const playerBoxes = this.playerLootboxes.get(this.currentPlayerId);
    if (!playerBoxes) {
      return null;
    }

    const lootbox = playerBoxes.find(box => box.id === lootboxId);
    if (!lootbox || lootbox.opened) {
      return null;
    }

    const drop = dropCalculator.calculateDrop(lootbox.rarity);
    lootbox.opened = true;
    lootbox.openedAt = new Date();

    const result: LootboxOpenResult = {
      lootboxId,
      boxType: lootbox.boxType,
      drop,
      openedAt: lootbox.openedAt,
      animationData: {
        spinDuration: this.getSpinDuration(lootbox.rarity),
        revealDelay: 500,
        isJackpot: drop.rarity === 'legendary',
      },
    };

    EventBus.emit('lootboxOpening', {
      lootboxId,
      boxType: lootbox.boxType,
    });

    await this.processDropReward(drop);

    EventBus.emit('lootboxOpened', {
      lootboxId,
      drop,
      isJackpot: result.animationData.isJackpot,
    });

    Logger.info(
      `[LootboxService] Opened ${LOOTBOX_CONFIGS[lootbox.boxType].name} → ${drop.name} (${drop.rarity})`
    );

    return result;
  }

  /**
   * Opens all unopened boxes of the specified type.
   */
  public async openAllOfType(boxType: LootboxType): Promise<LootboxOpenResult[]> {
    const results: LootboxOpenResult[] = [];
    const unopened = this.getUnopenedLootboxes().filter(box => box.boxType === boxType);

    for (const lootbox of unopened) {
      const result = await this.openLootbox(lootbox.id);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Returns a list of all currently unopened lootboxes for the player.
   */
  public getUnopenedLootboxes(): PlayerLootbox[] {
    if (!this.currentPlayerId) {
      return [];
    }
    const playerBoxes = this.playerLootboxes.get(this.currentPlayerId) ?? [];
    return playerBoxes.filter(box => !box.opened);
  }

  /**
   * Returns a breakdown of unopened box counts by rarity.
   */
  public getUnopenedCounts(): Record<LootboxRarity, number> {
    const unopened = this.getUnopenedLootboxes();
    return {
      common: unopened.filter(b => b.rarity === 'common').length,
      rare: unopened.filter(b => b.rarity === 'rare').length,
      epic: unopened.filter(b => b.rarity === 'epic').length,
      legendary: unopened.filter(b => b.rarity === 'legendary').length,
    };
  }

  /**
   * Returns total count of all unopened boxes.
   */
  public getTotalUnopenedCount(): number {
    return this.getUnopenedLootboxes().length;
  }

  /**
   * Generates a collision-resistant unique ID.
   * @private
   */
  private generateId(): string {
    return `lb_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Animation timing based on box rarity.
   * @private
   */
  private getSpinDuration(rarity: LootboxRarity): number {
    const durations: Record<LootboxRarity, number> = {
      common: 2000,
      rare: 2500,
      epic: 3000,
      legendary: 4000,
    };
    return durations[rarity];
  }

  /**
   * Distributes the drop to the player's inventory or wallet.
   * @private
   */
  private async processDropReward(drop: LootboxDrop): Promise<void> {
    switch (drop.category) {
      case 'coins': {
        const coinMatch = drop.name.match(/(\d+)/);
        const matchedAmount = coinMatch?.[1];
        if (matchedAmount) {
          const amount = parseInt(matchedAmount, 10);
          EventBus.emit('xpGained', { amount });
        }
        break;
      }
      case 'consumable':
        EventBus.emit('inventoryItemAdded', {
          itemType: 'consumable',
          itemId: drop.id,
          quantity: 1,
        });
        break;
      case 'character_skin':
        if ('skinId' in drop) {
          EventBus.emit('skinUnlocked', { skinId: drop.skinId });
        }
        break;
      case 'crypto_token':
        Logger.warn('[LootboxService] Crypto token dropped - this should not happen!');
        break;
    }
  }

  private hasSessionFlag(key: string): boolean {
    return this.sessionFlags.has(key);
  }

  private setSessionFlag(key: string): void {
    this.sessionFlags.add(key);
  }

  private handleGameReset(): void {
    this.sessionFlags.clear();
    Logger.debug('[LootboxService] Session flags cleared');
  }

  /**
   * Reset the service state for testing purposes.
   */
  public resetForTesting(): void {
    this.playerLootboxes.clear();
    this.sessionFlags.clear();
    this.currentPlayerId = null;
  }

  /**
   * Returns debug information for the inspector.
   */
  public getDebugState(): object {
    return {
      currentPlayerId: this.currentPlayerId,
      totalLootboxes: this.getUnopenedLootboxes().length,
      counts: this.getUnopenedCounts(),
      sessionFlags: Array.from(this.sessionFlags),
    };
  }

  /**
   * Manually awards a box for debugging/testing.
   */
  public debugAwardLootbox(boxType: LootboxType): PlayerLootbox | null {
    return this.earnLootbox(boxType, 'achievement');
  }
}

export const LootboxService = new LootboxServiceClass();
