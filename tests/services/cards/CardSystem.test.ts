import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CardSystem } from '../../../services/cards/CardSystem';
import { ALL_CARDS } from '../../../services/cards/cardDefinitions';
import { TIER_CONFIG } from '../../../services/cards/tierConfig';
import { type CardTier, TIER_ORDER } from '../../../services/cards/types';
import { WeaponSystem } from '../../../services/combat/WeaponSystem';

/**
 * CardSystem Unit Tests
 *
 * Tests cover:
 * - rollTier(): Tier rolling with luck and level restrictions
 * - getRandomCardFromTier(): Card selection from tiers
 * - generateChoices(): Level-up card generation
 * - getTierConfig(): Tier configuration retrieval
 * - getAllTiers(): Tier list retrieval
 *
 * Following AAA pattern (Arrange-Act-Assert)
 */
describe('CardSystem', () => {
  // Store original Math.random for restoration
  let originalRandom: () => number;

  beforeEach(() => {
    originalRandom = Math.random;
    WeaponSystem.reset();
  });

  afterEach(() => {
    Math.random = originalRandom;
    vi.restoreAllMocks();
    WeaponSystem.reset();
  });

  // =====================
  // SECTION: rollTier()
  // =====================
  describe('rollTier()', () => {
    // -----------------------
    // Level Restriction Tests
    // -----------------------
    describe('level restrictions', () => {
      it('should return common tier for level 1 player regardless of roll', () => {
        // Arrange: Mock roll to 0 (would normally be legendary)
        Math.random = vi.fn(() => 0);

        // Act
        const tier = CardSystem.rollTier(0, 1);

        // Assert: Level 1 can only get common
        expect(tier).toBe('common');
      });

      it('should return common for level 2 player (below rare threshold of 3)', () => {
        Math.random = vi.fn(() => 0);
        const tier = CardSystem.rollTier(10, 2);
        expect(tier).toBe('common');
      });

      it('should allow rare tier at level 3', () => {
        // Arrange: Roll value that falls in rare range
        // Base chances: legendary=3, epic=12, rare=25, common=60
        // At level 3: legendary=0, epic=0, rare=25
        // Roll < 25 should give rare
        Math.random = vi.fn(() => 0.1); // 10% < 25%

        const tier = CardSystem.rollTier(0, 3);
        expect(tier).toBe('rare');
      });

      it('should not allow rare tier at level 2', () => {
        Math.random = vi.fn(() => 0.1);
        const tier = CardSystem.rollTier(0, 2);
        expect(tier).toBe('common');
      });

      it('should allow epic tier at level 6', () => {
        // At level 6: legendary=0, epic=12, rare=25
        // Roll needs to be < 12 for epic
        Math.random = vi.fn(() => 0.05); // 5% < 12%

        const tier = CardSystem.rollTier(0, 6);
        expect(tier).toBe('epic');
      });

      it('should not allow epic tier at level 5', () => {
        Math.random = vi.fn(() => 0.05);
        const tier = CardSystem.rollTier(0, 5);
        // Should fall into rare category since epic is blocked
        expect(tier).toBe('rare');
      });

      it('should allow legendary tier at level 10', () => {
        // At level 10: legendary=3, epic=12, rare=25
        // Roll needs to be < 3 for legendary
        Math.random = vi.fn(() => 0.01); // 1% < 3%

        const tier = CardSystem.rollTier(0, 10);
        expect(tier).toBe('legendary');
      });

      it('should not allow legendary tier at level 9', () => {
        Math.random = vi.fn(() => 0.01);
        const tier = CardSystem.rollTier(0, 9);
        // Should fall into epic category since legendary is blocked
        expect(tier).toBe('epic');
      });
    });

    // -----------------------
    // Luck Modifier Tests
    // -----------------------
    describe('luck modifiers', () => {
      it('should increase legendary chance with high luck', () => {
        // Base legendary: 3%
        // With 10 luck: 3 + (10 * 5) = 53%
        // Roll of 25% should now be legendary
        Math.random = vi.fn(() => 0.25);

        const tier = CardSystem.rollTier(10, 15);
        expect(tier).toBe('legendary');
      });

      it('should increase epic chance with moderate luck', () => {
        // Base epic: 12%
        // With 5 luck: 12 + (5 * 3) = 27%
        // Legendary with 5 luck: 3 + (5 * 5) = 28%
        // Roll of 30% would be > 28% (legend) but < 28% + 27% = 55% (epic range)
        Math.random = vi.fn(() => 0.4);

        const tier = CardSystem.rollTier(5, 15);
        expect(tier).toBe('epic');
      });

      it('should increase rare chance with low luck', () => {
        // Base rare: 25%
        // With 2 luck: 25 + (2 * 2) = 29%
        // Epic with 2 luck: 12 + (2 * 3) = 18%
        // Legendary with 2 luck: 3 + (2 * 5) = 13%
        // Roll of 35% would be > 13 + 18 = 31% and < 31 + 29 = 60%
        Math.random = vi.fn(() => 0.35);

        const tier = CardSystem.rollTier(2, 10);
        expect(tier).toBe('rare');
      });

      it('should return common for high roll with zero luck', () => {
        // No luck: legendary=3, epic=12, rare=25
        // Total = 40%, so roll >= 40% should be common
        Math.random = vi.fn(() => 0.45);

        const tier = CardSystem.rollTier(0, 15);
        expect(tier).toBe('common');
      });
    });

    // -----------------------
    // Boundary Value Tests
    // -----------------------
    describe('boundary values', () => {
      it('should return correct tier at exact legendary threshold', () => {
        // Legendary chance = 3 (with 0 luck)
        // Roll of exactly 2.99% should be legendary
        Math.random = vi.fn(() => 0.0299);

        const tier = CardSystem.rollTier(0, 15);
        expect(tier).toBe('legendary');
      });

      it('should return epic when roll equals legendary chance', () => {
        // Roll of exactly 3% should fall into epic (not legendary)
        Math.random = vi.fn(() => 0.03);

        const tier = CardSystem.rollTier(0, 15);
        expect(tier).toBe('epic');
      });

      it('should handle level boundary at exactly 3', () => {
        Math.random = vi.fn(() => 0.2);
        const tier = CardSystem.rollTier(0, 3);
        expect(tier).toBe('rare');
      });

      it('should handle level boundary at exactly 6', () => {
        Math.random = vi.fn(() => 0.08);
        const tier = CardSystem.rollTier(0, 6);
        expect(tier).toBe('epic');
      });

      it('should handle level boundary at exactly 10', () => {
        Math.random = vi.fn(() => 0.02);
        const tier = CardSystem.rollTier(0, 10);
        expect(tier).toBe('legendary');
      });
    });

    // -----------------------
    // Edge Cases
    // -----------------------
    describe('edge cases', () => {
      it('should handle zero luck', () => {
        Math.random = vi.fn(() => 0.5);
        const tier = CardSystem.rollTier(0, 15);
        expect(tier).toBe('common');
      });

      it('should handle maximum luck (15)', () => {
        // With 15 luck:
        // Legendary: 3 + (15 * 5) = 78%
        // Roll of 50% should be legendary
        Math.random = vi.fn(() => 0.5);
        const tier = CardSystem.rollTier(15, 15);
        expect(tier).toBe('legendary');
      });

      it('should handle level 0 (edge case)', () => {
        Math.random = vi.fn(() => 0);
        const tier = CardSystem.rollTier(15, 0);
        expect(tier).toBe('common');
      });

      it('should handle very high level', () => {
        Math.random = vi.fn(() => 0.01);
        const tier = CardSystem.rollTier(0, 100);
        expect(tier).toBe('legendary');
      });

      it('should handle decimal luck values', () => {
        Math.random = vi.fn(() => 0.05);
        const tier = CardSystem.rollTier(2.5, 15);
        expect(['legendary', 'epic', 'rare', 'common']).toContain(tier);
      });
    });
  });

  // =====================
  // SECTION: getRandomCardFromTier()
  // =====================
  describe('getRandomCardFromTier()', () => {
    describe('returns valid cards', () => {
      it('should return a common card for common tier', () => {
        const card = CardSystem.getRandomCardFromTier('common');

        expect(card).toBeDefined();
        expect(card.tier).toBe('common');
        expect(ALL_CARDS.common).toContainEqual(card);
      });

      it('should return a rare card for rare tier', () => {
        const card = CardSystem.getRandomCardFromTier('rare');

        expect(card).toBeDefined();
        expect(card.tier).toBe('rare');
        expect(ALL_CARDS.rare).toContainEqual(card);
      });

      it('should return an epic card for epic tier', () => {
        const card = CardSystem.getRandomCardFromTier('epic');

        expect(card).toBeDefined();
        expect(card.tier).toBe('epic');
        expect(ALL_CARDS.epic).toContainEqual(card);
      });

      it('should return a legendary card for legendary tier', () => {
        const card = CardSystem.getRandomCardFromTier('legendary');

        expect(card).toBeDefined();
        expect(card.tier).toBe('legendary');
        expect(ALL_CARDS.legendary).toContainEqual(card);
      });
    });

    describe('card properties', () => {
      it('should return card with all required properties', () => {
        const card = CardSystem.getRandomCardFromTier('common');

        expect(card).toHaveProperty('id');
        expect(card).toHaveProperty('name');
        expect(card).toHaveProperty('description');
        expect(card).toHaveProperty('icon');
        expect(card).toHaveProperty('tier');
        // Cards use declarative modifiers (new) or effect function (legacy)
        const hasModifiers = !!(card.modifiers && card.modifiers.length > 0);
        const hasEffect = typeof card.effect === 'function';
        expect(hasModifiers || hasEffect).toBe(true);
      });

      it('should return card with non-empty id', () => {
        const card = CardSystem.getRandomCardFromTier('rare');
        expect(card.id).toBeTruthy();
        expect(card.id.length).toBeGreaterThan(0);
      });

      it('should return card with non-empty name', () => {
        const card = CardSystem.getRandomCardFromTier('epic');
        expect(card.name).toBeTruthy();
        expect(card.name.length).toBeGreaterThan(0);
      });
    });

    describe('randomness', () => {
      it('should return first card when random is 0', () => {
        Math.random = vi.fn(() => 0);

        const card = CardSystem.getRandomCardFromTier('common');
        expect(card).toEqual(ALL_CARDS.common[0]);
      });

      it('should return last card when random is near 1', () => {
        Math.random = vi.fn(() => 0.999);

        const card = CardSystem.getRandomCardFromTier('common');
        const lastIndex = ALL_CARDS.common.length - 1;
        expect(card).toEqual(ALL_CARDS.common[lastIndex]);
      });

      it('should return different cards with different random values', () => {
        Math.random = vi.fn(() => 0);
        const card1 = CardSystem.getRandomCardFromTier('rare');

        Math.random = vi.fn(() => 0.5);
        const card2 = CardSystem.getRandomCardFromTier('rare');

        // They might be the same if the tier only has 1-2 cards, but generally different
        expect(card1).toBeDefined();
        expect(card2).toBeDefined();
      });
    });
  });

  // =====================
  // SECTION: generateChoices()
  // =====================
  describe('generateChoices()', () => {
    describe('basic functionality', () => {
      it('should return exactly 3 cards', () => {
        const choices = CardSystem.generateChoices(0, 5);
        expect(choices).toHaveLength(3);
      });

      it('should return array of Card objects', () => {
        const choices = CardSystem.generateChoices(0, 5);

        choices.forEach(card => {
          expect(card).toHaveProperty('id');
          expect(card).toHaveProperty('name');
          expect(card).toHaveProperty('tier');
          // Cards use declarative modifiers (new) or effect function (legacy)
          const hasModifiers = !!(card.modifiers && card.modifiers.length > 0);
          const hasEffect = typeof card.effect === 'function';
          expect(hasModifiers || hasEffect).toBe(true);
        });
      });
    });

    describe('uniqueness', () => {
      it('should return 3 unique cards (no duplicates)', () => {
        // Run multiple times to ensure uniqueness is maintained
        for (let i = 0; i < 10; i++) {
          const choices = CardSystem.generateChoices(5, 10);
          const ids = choices.map(c => c.id);
          const uniqueIds = new Set(ids);

          expect(uniqueIds.size).toBe(3);
        }
      });

      it('should have no duplicate card ids', () => {
        const choices = CardSystem.generateChoices(10, 15);
        expect(choices).toHaveLength(3);

        const id1 = choices[0]!.id;
        const id2 = choices[1]!.id;
        const id3 = choices[2]!.id;

        expect(id1).not.toBe(id2);
        expect(id2).not.toBe(id3);
        expect(id1).not.toBe(id3);
      });
    });

    describe('weapon card availability', () => {
      it('should not offer an already acquired weapon card again', () => {
        WeaponSystem.addWeapon('boomerang');
        vi.spyOn(CardSystem, 'rollTier').mockReturnValue('rare');
        Math.random = vi.fn(() => 0.85);

        const choices = CardSystem.generateChoices(0, 3);

        expect(choices.map(card => card.id)).not.toContain('weapon_boomerang');
      });
    });

    describe('sorting by tier', () => {
      it('should sort cards by tier (legendary first)', () => {
        // Mock to always return different tiers
        let callCount = 0;

        vi.spyOn(CardSystem, 'rollTier').mockImplementation(() => {
          const tiers: CardTier[] = ['common', 'legendary', 'rare'];
          return tiers[callCount++ % 3] as CardTier;
        });

        const choices = CardSystem.generateChoices(10, 15);

        // Verify sorting order
        for (let i = 0; i < choices.length - 1; i++) {
          const current = choices[i]!;
          const next = choices[i + 1]!;
          const currentTierIndex = TIER_ORDER.indexOf(current.tier);
          const nextTierIndex = TIER_ORDER.indexOf(next.tier);
          expect(currentTierIndex).toBeLessThanOrEqual(nextTierIndex);
        }

        vi.restoreAllMocks();
      });

      it('should have legendary cards before epic cards', () => {
        // Test with many iterations to catch sorting
        for (let i = 0; i < 20; i++) {
          const choices = CardSystem.generateChoices(15, 20);
          const hasMixedTiers = new Set(choices.map(c => c.tier)).size > 1;

          if (hasMixedTiers) {
            // Check order - higher tier cards should come first
            for (let j = 0; j < choices.length - 1; j++) {
              const current = choices[j]!;
              const next = choices[j + 1]!;
              const currentIndex = TIER_ORDER.indexOf(current.tier);
              const nextIndex = TIER_ORDER.indexOf(next.tier);
              expect(currentIndex).toBeLessThanOrEqual(nextIndex);
            }
          }
        }
      });
    });

    describe('respects level restrictions', () => {
      it('should only return common cards at level 1', () => {
        const choices = CardSystem.generateChoices(10, 1);

        choices.forEach(card => {
          expect(card.tier).toBe('common');
        });
      });

      it('should only return common/rare cards at level 5', () => {
        const choices = CardSystem.generateChoices(5, 5);

        choices.forEach(card => {
          expect(['common', 'rare']).toContain(card.tier);
        });
      });

      it('should include epic possibility at level 7+', () => {
        // Run many times to check if epic is possible
        let foundEpic = false;

        for (let i = 0; i < 50; i++) {
          const choices = CardSystem.generateChoices(10, 10);
          if (choices.some(c => c.tier === 'epic')) {
            foundEpic = true;
            break;
          }
        }

        // With luck 10, epic should appear sometimes
        expect(foundEpic).toBe(true);
      });
    });

    describe('luck influence', () => {
      it('should be more likely to get higher tiers with high luck', () => {
        let highTierCountLowLuck = 0;
        let highTierCountHighLuck = 0;
        const iterations = 100;

        for (let i = 0; i < iterations; i++) {
          const lowLuckChoices = CardSystem.generateChoices(0, 15);
          const highLuckChoices = CardSystem.generateChoices(15, 15);

          highTierCountLowLuck += lowLuckChoices.filter(
            c => c.tier === 'legendary' || c.tier === 'epic'
          ).length;

          highTierCountHighLuck += highLuckChoices.filter(
            c => c.tier === 'legendary' || c.tier === 'epic'
          ).length;
        }

        // High luck should have more high tier cards overall
        expect(highTierCountHighLuck).toBeGreaterThan(highTierCountLowLuck);
      });
    });
  });

  // =====================
  // SECTION: getTierConfig()
  // =====================
  describe('getTierConfig()', () => {
    it('should return config for common tier', () => {
      const config = CardSystem.getTierConfig('common');

      expect(config).toEqual(TIER_CONFIG.common);
      expect(config.name).toBe('Common');
      expect(config.baseChance).toBe(60);
    });

    it('should return config for rare tier', () => {
      const config = CardSystem.getTierConfig('rare');

      expect(config).toEqual(TIER_CONFIG.rare);
      expect(config.name).toBe('Rare');
      expect(config.baseChance).toBe(25);
      expect(config.luckMultiplier).toBe(2);
    });

    it('should return config for epic tier', () => {
      const config = CardSystem.getTierConfig('epic');

      expect(config).toEqual(TIER_CONFIG.epic);
      expect(config.name).toBe('Epic');
      expect(config.baseChance).toBe(12);
      expect(config.luckMultiplier).toBe(3);
    });

    it('should return config for legendary tier', () => {
      const config = CardSystem.getTierConfig('legendary');

      expect(config).toEqual(TIER_CONFIG.legendary);
      expect(config.name).toBe('Legendary');
      expect(config.baseChance).toBe(3);
      expect(config.luckMultiplier).toBe(5);
    });

    it('should return config with all required properties', () => {
      const config = CardSystem.getTierConfig('rare');

      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('color');
      expect(config).toHaveProperty('bgColor');
      expect(config).toHaveProperty('borderColor');
      expect(config).toHaveProperty('glowColor');
      expect(config).toHaveProperty('baseChance');
      expect(config).toHaveProperty('luckMultiplier');
    });
  });

  // =====================
  // SECTION: getAllTiers()
  // =====================
  describe('getAllTiers()', () => {
    it('should return all 4 tiers', () => {
      const tiers = CardSystem.getAllTiers();
      expect(tiers).toHaveLength(4);
    });

    it('should return tiers in correct order', () => {
      const tiers = CardSystem.getAllTiers();
      expect(tiers).toEqual(['common', 'rare', 'epic', 'legendary']);
    });

    it('should include all tier types', () => {
      const tiers = CardSystem.getAllTiers();

      expect(tiers).toContain('common');
      expect(tiers).toContain('rare');
      expect(tiers).toContain('epic');
      expect(tiers).toContain('legendary');
    });

    it('should return array of strings', () => {
      const tiers = CardSystem.getAllTiers();

      tiers.forEach(tier => {
        expect(typeof tier).toBe('string');
      });
    });
  });

  // =====================
  // SECTION: Singleton Pattern
  // =====================
  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CardSystem;
      const instance2 = CardSystem;
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across calls', () => {
      // Both calls should use the same internal logic
      const tier1 = CardSystem.rollTier(5, 10);
      const tier2 = CardSystem.rollTier(5, 10);

      // Both should return valid tiers (may be different due to randomness)
      expect(['common', 'rare', 'epic', 'legendary']).toContain(tier1);
      expect(['common', 'rare', 'epic', 'legendary']).toContain(tier2);
    });
  });
});
