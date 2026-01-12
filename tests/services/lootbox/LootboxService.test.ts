import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LootboxService } from '../../../services/lootbox/LootboxService';
import { EventBus } from '../../../services/EventBus';
import { dropCalculator } from '../../../services/lootbox/LootboxDropCalculator';

describe('LootboxService', () => {
  const TEST_PLAYER_ID = 'player_123';

  beforeEach(() => {
    EventBus.clear();
    LootboxService.resetForTesting();
    LootboxService.setPlayer(TEST_PLAYER_ID);
  });

  describe('Player Context', () => {
    it('should set and get the current player ID', () => {
      expect(LootboxService.getCurrentPlayerId()).toBe(TEST_PLAYER_ID);
    });
  });

  describe('Earning Lootboxes', () => {
    it('should award a lootbox to the current player', () => {
      const box = LootboxService.earnLootbox('mining_crate', 'achievement');
      expect(box).not.toBeNull();
      expect(box?.boxType).toBe('mining_crate');
      expect(box?.playerId).toBe(TEST_PLAYER_ID);
      expect(box?.opened).toBe(false);
      expect(LootboxService.getTotalUnopenedCount()).toBe(1);
    });

    it('should emit lootboxEarned event when earning a box', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');
      LootboxService.earnLootbox('gas_box', 'cycle_complete');

      expect(emitSpy).toHaveBeenCalledWith(
        'lootboxEarned',
        expect.objectContaining({
          playerId: TEST_PLAYER_ID,
          boxType: 'gas_box',
          rarity: 'rare',
          source: 'cycle_complete',
        })
      );
    });

    it('should award cycle rewards based on cycle number', () => {
      const box1 = LootboxService.awardCycleReward(1);
      expect(box1?.boxType).toBe('mining_crate');

      const box2 = LootboxService.awardCycleReward(2);
      expect(box2?.boxType).toBe('gas_box');

      const box3 = LootboxService.awardCycleReward(3);
      expect(box3?.boxType).toBe('validator_vault');

      const box5 = LootboxService.awardCycleReward(5);
      expect(box5?.boxType).toBe('whale_wallet');
    });

    it('should handle wave milestones based on interval and chance', () => {
      // Mock Math.random to always succeed (0)
      vi.spyOn(Math, 'random').mockReturnValue(0);

      const box = LootboxService.checkWaveMilestone(5); // interval is 5
      expect(box).not.toBeNull();
      expect(box?.source).toBe('wave_milestone');

      const noBox = LootboxService.checkWaveMilestone(3); // not an interval of 5
      expect(noBox).toBeNull();

      vi.restoreAllMocks();
    });

    it('should handle kill streak rewards ensuring once per milestone', () => {
      const box100 = LootboxService.checkKillStreakReward(100);
      expect(box100).not.toBeNull();
      expect(box100?.source).toBe('kill_streak');

      // Second check at 100 should be null (already awarded)
      const cachedBox = LootboxService.checkKillStreakReward(100);
      expect(cachedBox).toBeNull();

      const box250 = LootboxService.checkKillStreakReward(250);
      expect(box250).not.toBeNull();
    });
  });

  describe('Opening Lootboxes', () => {
    it('should open a lootbox and return result', async () => {
      const box = LootboxService.earnLootbox('mining_crate', 'achievement');
      const boxId = box!.id;

      const result = await LootboxService.openLootbox(boxId);

      expect(result).not.toBeNull();
      expect(result?.lootboxId).toBe(boxId);
      expect(box?.opened).toBe(true);
      expect(LootboxService.getTotalUnopenedCount()).toBe(0);
    });

    it('should emit opening and opened events', async () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');
      const box = LootboxService.earnLootbox('gas_box', 'achievement');

      await LootboxService.openLootbox(box!.id);

      expect(emitSpy).toHaveBeenCalledWith('lootboxOpening', expect.any(Object));
      expect(emitSpy).toHaveBeenCalledWith('lootboxOpened', expect.any(Object));
    });

    it('should open all boxes of a specific type', async () => {
      LootboxService.earnLootbox('mining_crate', 'achievement');
      LootboxService.earnLootbox('mining_crate', 'achievement');
      LootboxService.earnLootbox('gas_box', 'achievement');

      expect(LootboxService.getTotalUnopenedCount()).toBe(3);

      const results = await LootboxService.openAllOfType('mining_crate');

      expect(results.length).toBe(2);
      expect(LootboxService.getTotalUnopenedCount()).toBe(1); // One gas_box remains
    });
  });

  describe('Inventory Queries', () => {
    it('should return correct unopened counts by rarity', () => {
      LootboxService.earnLootbox('mining_crate', 'achievement'); // common
      LootboxService.earnLootbox('gas_box', 'achievement'); // rare
      LootboxService.earnLootbox('gas_box', 'achievement'); // rare

      const counts = LootboxService.getUnopenedCounts();
      expect(counts.common).toBe(1);
      expect(counts.rare).toBe(2);
      expect(counts.epic).toBe(0);
    });
  });

  describe('Drop Processing', () => {
    it('should emit xpGained for coin drops', async () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');

      // Force a coin drop
      vi.spyOn(dropCalculator, 'calculateDrop').mockReturnValue({
        id: 'test_coins',
        category: 'coins',
        name: '500 Coins',
        icon: '💰',
        rarity: 'common',
        description: 'Test',
      } as any);

      const box = LootboxService.earnLootbox('mining_crate', 'achievement');
      await LootboxService.openLootbox(box!.id);

      expect(emitSpy).toHaveBeenCalledWith('xpGained', { amount: 500 });
      vi.restoreAllMocks();
    });

    it('should emit inventoryItemAdded for consumables', async () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');

      vi.spyOn(dropCalculator, 'calculateDrop').mockReturnValue({
        id: 'test_potion',
        category: 'consumable',
        name: 'Health Potion',
        icon: '🧪',
        rarity: 'rare',
        description: 'Test',
      } as any);

      const box = LootboxService.earnLootbox('gas_box', 'achievement');
      await LootboxService.openLootbox(box!.id);

      expect(emitSpy).toHaveBeenCalledWith(
        'inventoryItemAdded',
        expect.objectContaining({
          itemType: 'consumable',
          itemId: 'test_potion',
        })
      );
      vi.restoreAllMocks();
    });
  });
});
