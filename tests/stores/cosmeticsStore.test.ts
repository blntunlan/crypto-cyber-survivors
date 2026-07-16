import { beforeEach, describe, expect, it } from 'vitest';
import { useCosmeticsStore } from '../../stores/cosmeticsStore';

describe('cosmeticsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useCosmeticsStore.getState().reset();
  });

  it('adds only positive integer amounts', () => {
    useCosmeticsStore.getState().addEncryptedFragments(2.8);
    useCosmeticsStore.getState().addEncryptedFragments(-4);

    expect(useCosmeticsStore.getState().encryptedFragments).toBe(2);
  });

  it('persists encrypted fragments with version 2 state', () => {
    useCosmeticsStore.getState().addEncryptedFragments(3);

    const persisted = JSON.parse(localStorage.getItem('cosmetics-storage') ?? '{}') as {
      state?: { encryptedFragments?: number };
      version?: number;
    };

    expect(persisted.state?.encryptedFragments).toBe(3);
    expect(persisted.version).toBe(2);
  });

  it('clamps server fragment balances to non-negative integers', () => {
    useCosmeticsStore.getState().syncFromServer(['default'], 'default', 4.9);

    expect(useCosmeticsStore.getState().encryptedFragments).toBe(4);

    useCosmeticsStore
      .getState()
      .syncFromServer(['default'], 'default', Number.POSITIVE_INFINITY);

    expect(useCosmeticsStore.getState().encryptedFragments).toBe(0);
  });

  it('resets encrypted fragments to zero', () => {
    useCosmeticsStore.getState().addEncryptedFragments(5);

    useCosmeticsStore.getState().reset();

    expect(useCosmeticsStore.getState().encryptedFragments).toBe(0);
  });

  it('migrates version 1 state without losing owned skins', async () => {
    localStorage.setItem(
      'cosmetics-storage',
      JSON.stringify({
        state: { equippedSkinId: 'default', ownedSkinIds: ['default'] },
        version: 1,
      })
    );

    await useCosmeticsStore.persist.rehydrate();

    expect(useCosmeticsStore.getState().ownedSkinIds).toEqual(['default']);
    expect(useCosmeticsStore.getState().encryptedFragments).toBe(0);
  });
});
