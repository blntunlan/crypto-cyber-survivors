import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { assertLootEventEncounterOutput } from '@/game-v2/contracts/EncounterOutput';
import { LootEventEncounterConsumer } from '@/game-v2/market/LootEventEncounterConsumer';

const whaleOutput = assertLootEventEncounterOutput({
  kind: 'LOOT_EVENT',
  lootTierId: 'whale-loot',
  lootValue: 2,
});

const megaWhaleOutput = assertLootEventEncounterOutput({
  kind: 'LOOT_EVENT',
  lootTierId: 'mega-whale-loot',
  lootValue: 3,
});

describe('LootEventEncounterConsumer', () => {
  it('consumes a real whale-loot output into a frozen opportunity record', () => {
    const consumer = new LootEventEncounterConsumer();

    const opportunity = consumer.consume(whaleOutput, 42);

    expect(opportunity).toEqual({ lootTierId: 'whale-loot', lootValue: 2, tick: 42 });
    expect(Object.isFrozen(opportunity)).toBe(true);
  });

  it('consumes a real mega-whale-loot output correctly', () => {
    const consumer = new LootEventEncounterConsumer();

    const opportunity = consumer.consume(megaWhaleOutput, 100);

    expect(opportunity).toEqual({
      lootTierId: 'mega-whale-loot',
      lootValue: 3,
      tick: 100,
    });
  });

  it('throws on an unrecognized lootTierId', () => {
    const consumer = new LootEventEncounterConsumer();
    const unknownOutput = assertLootEventEncounterOutput({
      kind: 'LOOT_EVENT',
      lootTierId: 'legendary-loot',
      lootValue: 1,
    });

    expect(() => consumer.consume(unknownOutput, 0)).toThrow(
      'loot event encounter consumer received an unrecognized lootTierId: legendary-loot'
    );
  });

  it('throws when lootValue does not match the known tier real value (the bounded guarantee)', () => {
    const consumer = new LootEventEncounterConsumer();
    const mismatchedOutput = assertLootEventEncounterOutput({
      kind: 'LOOT_EVENT',
      lootTierId: 'whale-loot',
      lootValue: 999,
    });

    expect(() => consumer.consume(mismatchedOutput, 0)).toThrow(
      'loot event encounter consumer received a lootValue (999) that does not match the real value (2) for lootTierId: whale-loot'
    );
  });

  it('honours an injected known-tier-to-value map over the default', () => {
    const consumer = new LootEventEncounterConsumer(new Map([['bespoke-loot', 7]]));

    expect(() => consumer.consume(whaleOutput, 0)).toThrow(
      'loot event encounter consumer received an unrecognized lootTierId: whale-loot'
    );

    const bespokeOutput = assertLootEventEncounterOutput({
      kind: 'LOOT_EVENT',
      lootTierId: 'bespoke-loot',
      lootValue: 7,
    });
    expect(consumer.consume(bespokeOutput, 5)).toEqual({
      lootTierId: 'bespoke-loot',
      lootValue: 7,
      tick: 5,
    });
  });

  it('never imports or references any currency/economy/reward service (cannot mint settlement value)', () => {
    const source = readFileSync('game-v2/market/LootEventEncounterConsumer.ts', 'utf8');

    for (const forbidden of [
      'CoinService',
      'RewardCalculator',
      'WalletService',
      'creditCoins',
      'GameSessionService',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
