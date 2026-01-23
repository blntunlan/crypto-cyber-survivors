/**
 * CardSystem Tests
 *
 * Tests for card generation, tier rolling, and level restrictions.
 *
 * @updated Tests now use applyCardEffect instead of card.effect() directly,
 * and check for modifiers property (declarative) rather than effect function.
 */

import { describe, it, expect } from 'vitest';
import {
  CardSystem,
  type CardTier,
  ALL_CARDS_FLAT,
  type Card,
} from '../services/CardSystem';
import { applyCardEffect } from '../services/cards/CardApplicator';

describe('CardSystem', () => {
  describe('rollTier', () => {
    it('should only return common tier at level 1', () => {
      // Run multiple times to ensure consistency
      for (let i = 0; i < 50; i++) {
        const tier = CardSystem.rollTier(0, 1);
        expect(tier).toBe('common');
      }
    });

    it('should only return common tier at level 2', () => {
      for (let i = 0; i < 50; i++) {
        const tier = CardSystem.rollTier(5, 2); // Even with luck 5
        expect(tier).toBe('common');
      }
    });

    it('should allow rare tier at level 3+', () => {
      const tiers: CardTier[] = [];
      for (let i = 0; i < 100; i++) {
        tiers.push(CardSystem.rollTier(10, 5)); // High luck at level 5
      }
      // Should have some rare cards
      expect(tiers.filter(t => t === 'rare').length).toBeGreaterThan(0);
    });

    it('should allow epic tier at level 6+', () => {
      const tiers: CardTier[] = [];
      for (let i = 0; i < 200; i++) {
        tiers.push(CardSystem.rollTier(10, 10)); // High luck at level 10
      }
      // Should have some epic cards
      expect(tiers.filter(t => t === 'epic').length).toBeGreaterThan(0);
    });

    it('should allow legendary tier at level 10+', () => {
      const tiers: CardTier[] = [];
      for (let i = 0; i < 500; i++) {
        tiers.push(CardSystem.rollTier(10, 15)); // High luck at level 15
      }
      // Should have some legendary cards
      expect(tiers.filter(t => t === 'legendary').length).toBeGreaterThan(0);
    });

    it('should not allow legendary tier before level 10', () => {
      for (let i = 0; i < 100; i++) {
        const tier = CardSystem.rollTier(15, 9); // Max luck at level 9
        expect(tier).not.toBe('legendary');
      }
    });
  });

  describe('generateChoices', () => {
    it('should return exactly 3 cards', () => {
      const choices = CardSystem.generateChoices(0, 5);
      expect(choices).toHaveLength(3);
    });

    it('should return unique cards (no duplicates)', () => {
      const choices = CardSystem.generateChoices(0, 10);
      const ids = choices.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('should return cards sorted by tier (legendary first)', () => {
      // Run multiple times to catch sorted order
      for (let i = 0; i < 20; i++) {
        const choices = CardSystem.generateChoices(10, 15);
        const tierOrder: CardTier[] = ['legendary', 'epic', 'rare', 'common'];

        for (let j = 0; j < choices.length - 1; j++) {
          const currentIndex = tierOrder.indexOf(choices[j]!.tier);
          const nextIndex = tierOrder.indexOf(choices[j + 1]!.tier);
          expect(currentIndex).toBeLessThanOrEqual(nextIndex);
        }
      }
    });

    it('should only return common cards at level 1', () => {
      for (let i = 0; i < 20; i++) {
        const choices = CardSystem.generateChoices(10, 1);
        expect(choices.every(c => c.tier === 'common')).toBe(true);
      }
    });
  });

  describe('getRandomCardFromTier', () => {
    it('should return a card from the specified tier', () => {
      const card = CardSystem.getRandomCardFromTier('rare');
      expect(card.tier).toBe('rare');
    });

    it('should return different cards on multiple calls', () => {
      const cards = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const card = CardSystem.getRandomCardFromTier('common');
        cards.add(card.id);
      }
      // Should have multiple different cards
      expect(cards.size).toBeGreaterThan(1);
    });
  });

  describe('card effects', () => {
    // Mock player for testing effects
    const basePlayer = {
      baseDamage: 25,
      hp: 100,
      maxHp: 100,
      speed: 4,
      fireRate: 500,
      critChance: 0.05,
      critDamage: 2.0,
      luck: 0,
      lifesteal: 0,
      dodge: 0,
      magnet: 100,
      armor: 0,
      area: 1,
      projectiles: 1,
      regen: 0,
      x: 0,
      y: 0,
      radius: 12,
      color: '#ffffff',
      level: 1,
      exp: 0,
      nextLevelExp: 100,
      invulnerable: false,
      invulnerabilityTimer: 0,
      dead: false,
      velocity: { x: 0, y: 0 },
      isDashing: false,
      dashCooldown: 0,
      weapon: 'pistol' as const,
    };

    it('should apply every card effect without error', () => {
      ALL_CARDS_FLAT.forEach((card: Card) => {
        // Cards use either modifiers (declarative) or effect (imperative)
        expect(card.modifiers ?? card.effect).toBeDefined();

        // Apply card using CardApplicator
        const result = applyCardEffect({ ...basePlayer }, card);

        // Basic sanity checks
        expect(result).toBeDefined();
        expect(result.baseDamage).not.toBeNaN();
        expect(result.maxHp).not.toBeNaN();
        expect(result.speed).not.toBeNaN();

        // Visual feedback for debugging which card might fail
        if (Number.isNaN(result.baseDamage)) {
          console.error(`Card ${card.name} (${card.id}) produced NaN baseDamage`);
        }
      });
    });

    it('should modify specific stats for known card types', () => {
      // Test specific cards to ensure logic correctness
      // Market Order (Common) -> +8 Damage
      const marketOrder = ALL_CARDS_FLAT.find((c: Card) => c.id === 'dmg_c1');
      if (marketOrder) {
        const res = applyCardEffect({ ...basePlayer }, marketOrder);
        expect(res.baseDamage).toBe(basePlayer.baseDamage + 8);
      }

      // Quick Trade (Common) -> -8% fireRate (means faster attack)
      const quickTrade = ALL_CARDS_FLAT.find((c: Card) => c.id === 'spd_c1');
      if (quickTrade) {
        const res = applyCardEffect({ ...basePlayer }, quickTrade);
        // -8% as percent modifier means fireRate * (1 - 0.08) = fireRate * 0.92
        expect(res.fireRate).toBe(basePlayer.fireRate * 0.92);
      }

      // Full Ape Mode (Legendary) -> 0.5x Fire Rate (multiply), -20% HP
      const apeMode = ALL_CARDS_FLAT.find((c: Card) => c.id === 'ape_l1');
      if (apeMode) {
        const res = applyCardEffect({ ...basePlayer }, apeMode);
        expect(res.fireRate).toBe(basePlayer.fireRate * 0.5);
        expect(res.maxHp).toBe(basePlayer.maxHp * 0.8);
        // HP should be capped to new maxHp when maxHp decreases
        expect(res.hp).toBe(res.maxHp);
      }
    });

    it('should increase hp when maxHp increases via card', () => {
      // shield_r1 (HODL Shield) has only maxHp modifier (+10)
      // CardApplicator automatically syncs hp with maxHp delta
      const shieldCard = ALL_CARDS_FLAT.find((c: Card) => c.id === 'shield_r1');
      if (shieldCard) {
        const playerWithDamage = { ...basePlayer, hp: 80, maxHp: 100 };
        const res = applyCardEffect(playerWithDamage, shieldCard);

        // maxHp should increase by 10
        expect(res.maxHp).toBe(110);
        // hp should also increase by 10 (auto-sync from maxHp delta)
        expect(res.hp).toBe(90);
      }

      // Test with a player at full HP
      const fullHpPlayer = { ...basePlayer, hp: 100, maxHp: 100 };
      if (shieldCard) {
        const res = applyCardEffect(fullHpPlayer, shieldCard);
        expect(res.maxHp).toBe(110);
        // HP should increase with maxHp (auto-sync), becoming 110
        expect(res.hp).toBe(110);
      }
    });

    it('should have modifiers or effect for all cards', () => {
      ALL_CARDS_FLAT.forEach((card: Card) => {
        // Every card must have either modifiers (new declarative way) or effect (legacy)
        const hasModifiers = !!(card.modifiers && card.modifiers.length > 0);
        const hasEffect = typeof card.effect === 'function';
        expect(hasModifiers || hasEffect).toBe(true);
      });
    });
  });

  describe('Utilities', () => {
    it('should return correct tier config', () => {
      const commonConfig = CardSystem.getTierConfig('common');
      expect(commonConfig.name).toBe('Common');
      expect(commonConfig.baseChance).toBe(60);

      const legendaryConfig = CardSystem.getTierConfig('legendary');
      expect(legendaryConfig.name).toBe('Legendary');
      expect(legendaryConfig.luckMultiplier).toBe(5);
    });

    it('should return all available tiers', () => {
      const tiers = CardSystem.getAllTiers();
      expect(tiers).toHaveLength(4);
      expect(tiers).toContain('common');
      expect(tiers).toContain('rare');
      expect(tiers).toContain('epic');
      expect(tiers).toContain('legendary');
    });
  });
});
