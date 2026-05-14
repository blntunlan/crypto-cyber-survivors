import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetaProgressionService } from '../../../services/progression/MetaProgressionService';
import { useMetaProgressionStore } from '../../../stores/metaProgressionStore';
import { type Player } from '../../../types';
import { railwayClient } from '../../../services/api/RailwayClient';

vi.mock('../../../services/api/RailwayClient', () => ({
  railwayClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  x: 0,
  y: 0,
  radius: 12,
  color: '#ffffff',
  level: 1,
  exp: 0,
  nextLevelExp: 100,
  hp: 100,
  maxHp: 100,
  invulnerabilityTimer: 0,
  baseDamage: 25,
  fireRate: 400,
  critChance: 0.05,
  critDamage: 2,
  area: 1,
  projectiles: 1,
  armor: 0,
  regen: 0,
  dodge: 0,
  speed: 5,
  luck: 0,
  lifesteal: 0,
  magnet: 0,
  ...overrides,
});

describe('MetaProgressionService', () => {
  beforeEach(() => {
    localStorage.clear();
    useMetaProgressionStore.getState().reset();
    MetaProgressionService.reset();
    vi.mocked(railwayClient.post).mockReset();
  });

  it('applies run-affecting meta upgrade bonuses to player state', () => {
    const store = useMetaProgressionStore.getState();
    store.setUpgradeLevel('DASH_COOLDOWN', 2);
    store.setUpgradeLevel('XP_ACCELERATOR', 3);
    store.setUpgradeLevel('STARTING_LEVEL_2', 1);

    const player = makePlayer();
    const upgraded = MetaProgressionService.applyBonuses(player);

    expect(upgraded.level).toBe(2);
    expect(upgraded.dashCooldownMultiplier).toBeCloseTo(0.6);
    expect(upgraded.expMultiplier).toBeCloseTo(1.3);
    expect(player.level).toBe(1);
    expect(player.dashCooldownMultiplier).toBeUndefined();
  });

  it('applies runtime multipliers idempotently from base values', () => {
    const store = useMetaProgressionStore.getState();
    store.setUpgradeLevel('DASH_COOLDOWN', 1);
    store.setUpgradeLevel('XP_ACCELERATOR', 2);

    const once = MetaProgressionService.applyBonuses(makePlayer());
    const twice = MetaProgressionService.applyBonuses(once);

    expect(once.dashCooldownMultiplier).toBeCloseTo(0.8);
    expect(twice.dashCooldownMultiplier).toBeCloseTo(0.8);
    expect(once.expMultiplier).toBeCloseTo(1.2);
    expect(twice.expMultiplier).toBeCloseTo(1.2);
  });

  it('keeps existing combat, survival, and economy bonuses functional', () => {
    const store = useMetaProgressionStore.getState();
    store.setUpgradeLevel('DAMAGE_BOOST', 2);
    store.setUpgradeLevel('CRIT_MASTERY', 1);
    store.setUpgradeLevel('EXTRA_PROJECTILE', 1);
    store.setUpgradeLevel('HP_RESERVOIR', 2);
    store.setUpgradeLevel('ARMOR_PLATING', 1);
    store.setUpgradeLevel('COIN_MAGNET', 2);
    store.setUpgradeLevel('LUCK_GENE', 1);

    const upgraded = MetaProgressionService.applyBonuses(makePlayer());

    expect(upgraded.baseDamage).toBe(29);
    expect(upgraded.critChance).toBeCloseTo(0.1);
    expect(upgraded.projectiles).toBe(2);
    expect(upgraded.maxHp).toBe(130);
    expect(upgraded.hp).toBe(130);
    expect(upgraded.armor).toBe(1);
    expect(upgraded.magnet).toBe(50);
    expect(upgraded.luck).toBe(3);
  });

  it('exposes special upgrade runtime modifiers', () => {
    expect(MetaProgressionService.getCardChoiceCount()).toBe(3);
    expect(MetaProgressionService.getStartingLiquidationGraceMs(3_000)).toBe(3_000);

    const store = useMetaProgressionStore.getState();
    store.setUpgradeLevel('QUAD_CARD_CHOICE', 1);
    store.setUpgradeLevel('GRACE_EXTENSION', 1);

    expect(MetaProgressionService.getCardChoiceCount()).toBe(4);
    expect(MetaProgressionService.getStartingLiquidationGraceMs(3_000)).toBe(8_000);
    expect(MetaProgressionService.getStartingLiquidationGraceMs(10_000)).toBe(10_000);
  });

  it('applies purchases only after gameplay and server response validation pass', async () => {
    const store = useMetaProgressionStore.getState();
    store.addMetaCoins(100);
    vi.mocked(railwayClient.post).mockResolvedValue({
      upgradeId: 'COIN_MAGNET',
      newLevel: 1,
      newMetaCoins: 70,
      cost: 30,
    });

    const purchased = await MetaProgressionService.purchaseUpgrade('COIN_MAGNET');
    const nextState = useMetaProgressionStore.getState();

    expect(purchased).toBe(true);
    expect(nextState.metaCoins).toBe(70);
    expect(nextState.upgrades.COIN_MAGNET).toBe(1);
  });

  it('rejects mismatched purchase responses without spending local meta coins', async () => {
    const store = useMetaProgressionStore.getState();
    store.addMetaCoins(100);
    vi.mocked(railwayClient.post).mockResolvedValue({
      upgradeId: 'COIN_MAGNET',
      newLevel: 3,
      newMetaCoins: 999,
      cost: 1,
    });

    const purchased = await MetaProgressionService.purchaseUpgrade('COIN_MAGNET');
    const nextState = useMetaProgressionStore.getState();

    expect(purchased).toBe(false);
    expect(nextState.metaCoins).toBe(100);
    expect(nextState.upgrades.COIN_MAGNET).toBe(0);
  });
});
