/**
 * InventoryService Tests
 *
 * Tests for the Inventory management singleton.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InventoryService } from '../../services/inventory/InventoryService';
import { EventBus } from '../../services/EventBus';
import { Logger } from '../../services/Logger';

// Mock dependencies
// Note: Mocks are hoisted, so this runs before imports
vi.mock('../../services/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    subscribe: vi.fn(),
  },
}));

vi.mock('../../services/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InventoryService', () => {
  const playerId = 'test-player-1';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset private state
    InventoryService.resetForTests();
    InventoryService.setPlayer(playerId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Player Context', () => {
    it('should initialize empty inventory for new player', () => {
      const inventory = InventoryService.getInventory();
      expect(inventory).not.toBeNull();
      expect(inventory?.playerId).toBe(playerId);
      expect(inventory?.consumables).toEqual([]);
      expect(inventory?.skins).toEqual([]);
      expect(inventory?.equippedSkin).toBe('default');
    });

    it('should switch players correctly', () => {
      InventoryService.setPlayer('player-2');
      expect(InventoryService.getInventory()?.playerId).toBe('player-2');
    });
  });

  describe('Consumables', () => {
    it('should add a valid consumable', () => {
      const added = InventoryService.addItem('consumable', 'flash_loan', 2);
      expect(added).toBe(true);

      const inventory = InventoryService.getInventory();
      const item = inventory?.consumables.find(c => c.itemId === 'flash_loan');
      expect(item).toBeDefined();
      expect(item?.quantity).toBe(2);

      expect(EventBus.emit).toHaveBeenCalledWith(
        'inventoryUpdated',
        expect.objectContaining({ itemId: 'flash_loan', action: 'add' })
      );
    });

    it('should stack existing consumables', () => {
      InventoryService.addItem('consumable', 'flash_loan', 2);
      InventoryService.addItem('consumable', 'flash_loan', 3);

      const count = InventoryService.getConsumableCount('flash_loan');
      expect(count).toBe(5);
    });

    it('should respect max stack limit', () => {
      // flash_loan max stack is 10
      InventoryService.addItem('consumable', 'flash_loan', 8);
      InventoryService.addItem('consumable', 'flash_loan', 5);

      const count = InventoryService.getConsumableCount('flash_loan');
      expect(count).toBe(10);
    });

    it('should reject invalid consumable IDs', () => {
      const added = InventoryService.addItem('consumable', 'invalid_id', 1);
      expect(added).toBe(false);
      expect(Logger.warn).toHaveBeenCalled();
    });

    it('should use a consumable', () => {
      InventoryService.addItem('consumable', 'flash_loan', 2);
      const used = InventoryService.useConsumable('flash_loan');

      expect(used).toBe(true);
      expect(InventoryService.getConsumableCount('flash_loan')).toBe(1);

      expect(EventBus.emit).toHaveBeenCalledWith(
        'consumableUsed',
        expect.objectContaining({ itemId: 'flash_loan' })
      );
    });

    it('should fail to use missing consumable', () => {
      const used = InventoryService.useConsumable('missing_item');
      expect(used).toBe(false);
    });
  });

  describe('Skins', () => {
    it('should add/unlock a skin', () => {
      const added = InventoryService.unlockSkin('satoshi_ghost');
      expect(added).toBe(true);

      const skins = InventoryService.getOwnedSkins();
      expect(skins).toContain('satoshi_ghost');
    });

    it('should not add duplicate skins', () => {
      InventoryService.unlockSkin('satoshi_ghost');
      const addedSecondTime = InventoryService.unlockSkin('satoshi_ghost');

      expect(addedSecondTime).toBe(false);
      const skins = InventoryService.getOwnedSkins();
      // 'default' + 'satoshi_ghost'
      expect(skins.filter(s => s === 'satoshi_ghost').length).toBe(1);
    });

    it('should equip an owned skin', () => {
      InventoryService.unlockSkin('satoshi_ghost');
      const equipped = InventoryService.equipSkin('satoshi_ghost');

      expect(equipped).toBe(true);
      expect(InventoryService.getEquippedSkin()).toBe('satoshi_ghost');
    });

    it('should fail to equip unowned skin', () => {
      const equipped = InventoryService.equipSkin('degen_ape');
      expect(equipped).toBe(false);
      expect(InventoryService.getEquippedSkin()).toBe('default'); // Default remains
    });
  });

  describe('Crypto Tokens', () => {
    it('should add crypto tokens', () => {
      const added = InventoryService.addItem('crypto_token', 'BTC', 0.5);
      expect(added).toBe(true);

      const tokens = InventoryService.getCryptoTokens();
      expect(tokens).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tokenType: 'BTC', amount: 0.5 }),
        ])
      );
    });

    it('should accumulate crypto tokens', () => {
      InventoryService.addItem('crypto_token', 'ETH', 1.0);
      InventoryService.addItem('crypto_token', 'ETH', 2.5);

      const tokens = InventoryService.getCryptoTokens();
      const eth = tokens.find(t => t.tokenType === 'ETH');
      expect(eth?.amount).toBe(3.5);
    });
  });
});
