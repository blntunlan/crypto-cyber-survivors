import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryService } from '../../services/inventory/InventoryService';
import { EventBus } from '../../services/core/EventBus';
import { CONSUMABLE_DEFINITIONS } from '../../types/inventory';

describe('InventoryService', () => {
  beforeEach(() => {
    InventoryService.resetForTests();
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  describe('Player Context', () => {
    it('should initialize empty inventory for new player', () => {
      InventoryService.setPlayer('player1');
      const inv = InventoryService.getInventory();
      expect(inv).toBeDefined();
      expect(inv?.playerId).toBe('player1');
      expect(inv?.consumables).toHaveLength(0);
    });

    it('should switch between player inventories', () => {
      InventoryService.setPlayer('p1');
      InventoryService.addItem('consumable', 'staking_reward', 1);

      InventoryService.setPlayer('p2');
      expect(InventoryService.getConsumableCount('staking_reward')).toBe(0);

      InventoryService.setPlayer('p1');
      expect(InventoryService.getConsumableCount('staking_reward')).toBe(1);
    });
  });

  describe('Consumables', () => {
    beforeEach(() => {
      InventoryService.setPlayer('test-player');
    });

    it('should add and stack consumables', () => {
      InventoryService.addItem('consumable', 'staking_reward', 2);
      expect(InventoryService.getConsumableCount('staking_reward')).toBe(2);

      InventoryService.addItem('consumable', 'staking_reward', 1);
      expect(InventoryService.getConsumableCount('staking_reward')).toBe(3);
    });

    it('should respect max stack limits', () => {
      const def = CONSUMABLE_DEFINITIONS['staking_reward'];
      // Ensure definition exists
      expect(def).toBeDefined();
      InventoryService.addItem('consumable', 'staking_reward', def!.maxStack + 10);
      expect(InventoryService.getConsumableCount('staking_reward')).toBe(def!.maxStack);
    });

    it('should reject invalid inventory grant quantities', () => {
      expect(InventoryService.addItem('consumable', 'staking_reward', -2)).toBe(false);
      expect(InventoryService.addItem('consumable', 'staking_reward', Number.NaN)).toBe(
        false
      );
      expect(InventoryService.addItem('consumable', 'staking_reward', 1.5)).toBe(false);
      expect(InventoryService.getConsumableCount('staking_reward')).toBe(0);
    });

    it('should use consumables and apply effects', () => {
      InventoryService.addItem('consumable', 'staking_reward', 5);

      const success = InventoryService.useConsumable('staking_reward');

      expect(success).toBe(true);
      expect(InventoryService.getConsumableCount('staking_reward')).toBe(4);
    });

    it('should handle timed effects correctly', () => {
      // flash_loan gives damage boost for 30s
      InventoryService.addItem('consumable', 'flash_loan', 1);
      InventoryService.useConsumable('flash_loan');

      const multiplier = InventoryService.getEffectMultiplier('damage_boost');
      expect(multiplier).toBeGreaterThan(1.0);

      // Advance time 31 seconds
      vi.advanceTimersByTime(31000);

      expect(InventoryService.getEffectMultiplier('damage_boost')).toBe(1.0);
    });
  });

  describe('Character Skins', () => {
    it('should unlock and equip skins', () => {
      InventoryService.setPlayer('p1');

      // Default skin
      expect(InventoryService.getEquippedSkin()).toBe('default');

      // Unlock new skin
      InventoryService.unlockSkin('diamond_hands');
      expect(InventoryService.getOwnedSkins()).toContain('diamond_hands');

      // Equip
      InventoryService.equipSkin('diamond_hands');
      expect(InventoryService.getEquippedSkin()).toBe('diamond_hands');
    });

    it('should not equip unowned skins', () => {
      InventoryService.setPlayer('p1');
      const success = InventoryService.equipSkin('satoshi_ghost');
      expect(success).toBe(false);
      expect(InventoryService.getEquippedSkin()).toBe('default');
    });

    it('should reject unknown skin grants without mutating inventory', () => {
      InventoryService.setPlayer('p1');

      expect(InventoryService.addItem('character_skin', 'not_real_skin', 1)).toBe(
        false
      );
      expect(InventoryService.getOwnedSkins()).toEqual(['default']);
    });
  });

  describe('Crypto Tokens', () => {
    it('should allow fractional token grants and reject negative grants', () => {
      InventoryService.setPlayer('p1');

      expect(InventoryService.addItem('crypto_token', 'BTC', 0.001)).toBe(true);
      expect(InventoryService.addItem('crypto_token', 'BTC', -0.5)).toBe(false);

      expect(InventoryService.getCryptoTokens()).toEqual([
        { tokenType: 'BTC', amount: 0.001 },
      ]);
    });

    it('should reject unknown token grants', () => {
      InventoryService.setPlayer('p1');

      expect(InventoryService.addItem('crypto_token', 'DOGE', 1)).toBe(false);
      expect(InventoryService.getCryptoTokens()).toEqual([]);
    });
  });

  describe('Event Integration', () => {
    it('should respond to inventoryItemAdded event', () => {
      InventoryService.setPlayer('p1');

      // Simulating event from LootboxService
      EventBus.emit('inventoryItemAdded', {
        itemType: 'consumable',
        itemId: 'staking_reward',
        quantity: 3,
      });

      expect(InventoryService.getConsumableCount('staking_reward')).toBe(3);
    });

    it('should clear timed effects on gameReset', () => {
      InventoryService.setPlayer('p1');
      InventoryService.addItem('consumable', 'flash_loan', 1);
      InventoryService.useConsumable('flash_loan');

      // Verify active
      expect(InventoryService.getEffectMultiplier('damage_boost')).toBeGreaterThan(1.0);

      // Trigger reset
      EventBus.emit('gameReset', {});

      expect(InventoryService.getEffectMultiplier('damage_boost')).toBe(1.0);
    });
  });
});
