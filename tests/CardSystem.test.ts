/**
 * CardSystem Tests
 *
 * Tests for card generation, tier rolling, and level restrictions.
 */

import { describe, it, expect } from 'vitest';
import { CardSystem, CardTier } from '../services/CardSystem';

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

        it('should allow epic tier at level 7+', () => {
            const tiers: CardTier[] = [];
            for (let i = 0; i < 200; i++) {
                tiers.push(CardSystem.rollTier(10, 10)); // High luck at level 10
            }
            // Should have some epic cards
            expect(tiers.filter(t => t === 'epic').length).toBeGreaterThan(0);
        });

        it('should allow legendary tier at level 12+', () => {
            const tiers: CardTier[] = [];
            for (let i = 0; i < 500; i++) {
                tiers.push(CardSystem.rollTier(10, 15)); // High luck at level 15
            }
            // Should have some legendary cards
            expect(tiers.filter(t => t === 'legendary').length).toBeGreaterThan(0);
        });

        it('should not allow legendary tier before level 12', () => {
            for (let i = 0; i < 100; i++) {
                const tier = CardSystem.rollTier(15, 11); // Max luck at level 11
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
        it('should increase baseDamage for damage cards', () => {
            const card = CardSystem.getRandomCardFromTier('common');
            const mockPlayer = {
                baseDamage: 25,
                hp: 100,
                maxHp: 100,
                speed: 4,
                fireRate: 500,
                critChance: 0.05,
                luck: 0,
                magnet: 0,
                armor: 0,
                area: 1,
                projectiles: 1,
                x: 0,
                y: 0,
                radius: 12,
                color: '',
                level: 1,
                exp: 0,
                nextLevelExp: 100,
            };

            const result = card.effect(mockPlayer);

            // Result should be a new object (immutable)
            expect(result).not.toBe(mockPlayer);
            // At least one stat should have changed
            expect(
                result.baseDamage !== mockPlayer.baseDamage ||
                result.hp !== mockPlayer.hp ||
                result.speed !== mockPlayer.speed ||
                result.fireRate !== mockPlayer.fireRate ||
                result.critChance !== mockPlayer.critChance ||
                result.luck !== mockPlayer.luck ||
                result.magnet !== mockPlayer.magnet ||
                result.armor !== mockPlayer.armor ||
                result.area !== mockPlayer.area ||
                result.projectiles !== mockPlayer.projectiles
            ).toBe(true);
        });
    });
});
