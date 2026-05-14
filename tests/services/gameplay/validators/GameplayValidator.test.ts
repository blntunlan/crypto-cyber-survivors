import { describe, expect, it } from 'vitest';
import { GameplayValidator } from '../../../../services/gameplay/validators';

describe('GameplayValidator', () => {
  describe('validateMetaUpgradePurchase', () => {
    it('accepts a valid local and server-confirmed upgrade purchase', () => {
      const result = GameplayValidator.validateMetaUpgradePurchase({
        upgradeId: 'COIN_MAGNET',
        currentLevel: 0,
        metaCoins: 100,
        serverNewLevel: 1,
        serverNewMetaCoins: 70,
        serverCost: 30,
      });

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('rejects maxed upgrades and insufficient balances', () => {
      const maxed = GameplayValidator.validateMetaUpgradePurchase({
        upgradeId: 'GRACE_EXTENSION',
        currentLevel: 1,
        metaCoins: 10_000,
      });
      const broke = GameplayValidator.validateMetaUpgradePurchase({
        upgradeId: 'COIN_MAGNET',
        currentLevel: 0,
        metaCoins: 29,
      });

      expect(maxed.valid).toBe(false);
      expect(maxed.issues[0]?.reason).toContain('max level');
      expect(broke.valid).toBe(false);
      expect(broke.issues[0]?.reason).toContain('Insufficient');
    });

    it('rejects server responses that would jump level, alter cost, or mint coins', () => {
      const result = GameplayValidator.validateMetaUpgradePurchase({
        upgradeId: 'COIN_MAGNET',
        currentLevel: 0,
        metaCoins: 100,
        serverNewLevel: 3,
        serverNewMetaCoins: 500,
        serverCost: 1,
      });

      expect(result.valid).toBe(false);
      expect(result.issues.map(issue => issue.validator)).toEqual([
        'meta_upgrade_server',
        'meta_upgrade_server',
        'meta_upgrade_server',
      ]);
    });
  });

  describe('inventory validation', () => {
    it('rejects invalid inventory quantities', () => {
      const negative = GameplayValidator.validateInventoryGrant({
        itemType: 'consumable',
        itemId: 'staking_reward',
        quantity: -1,
      });
      const fractionalConsumable = GameplayValidator.validateInventoryGrant({
        itemType: 'consumable',
        itemId: 'staking_reward',
        quantity: 1.5,
      });

      expect(negative.valid).toBe(false);
      expect(fractionalConsumable.valid).toBe(false);
    });

    it('rejects unknown inventory item ids', () => {
      const consumable = GameplayValidator.validateInventoryGrant({
        itemType: 'consumable',
        itemId: 'not_real',
        quantity: 1,
      });
      const skin = GameplayValidator.validateInventoryGrant({
        itemType: 'character_skin',
        itemId: 'not_real',
        quantity: 1,
      });
      const token = GameplayValidator.validateInventoryGrant({
        itemType: 'crypto_token',
        itemId: 'DOGE',
        quantity: 0.001,
        allowFractionalQuantity: true,
      });

      expect(consumable.valid).toBe(false);
      expect(skin.valid).toBe(false);
      expect(token.valid).toBe(false);
    });

    it('allows fractional crypto-token grants and warns on capped stacks', () => {
      const token = GameplayValidator.validateInventoryGrant({
        itemType: 'crypto_token',
        itemId: 'BTC',
        quantity: 0.001,
        allowFractionalQuantity: true,
      });
      const capped = GameplayValidator.validateInventoryGrant({
        itemType: 'consumable',
        itemId: 'staking_reward',
        quantity: 3,
        currentQuantity: 9,
        maxStack: 10,
      });

      expect(token.valid).toBe(true);
      expect(capped.valid).toBe(true);
      expect(capped.issues[0]?.severity).toBe('warn');
    });

    it('rejects unavailable consumables and unowned skins', () => {
      const consumable = GameplayValidator.validateConsumableUse({
        itemId: 'flash_loan',
        currentQuantity: 0,
      });
      const skin = GameplayValidator.validateSkinEquip({
        skinId: 'satoshi_ghost',
        ownedSkinIds: ['default'],
      });

      expect(consumable.valid).toBe(false);
      expect(skin.valid).toBe(false);
    });
  });
});
