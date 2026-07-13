import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkinService } from '../../../services/skins/SkinService';
import { InventoryService } from '../../../services/inventory/InventoryService';
import { useCosmeticsStore } from '../../../stores/cosmeticsStore';
import { EventBus } from '../../../services/core/EventBus';
import { SKIN_VISUAL_REGISTRY } from '../../../config/SkinRegistry';

const LONG_GREEN = '#22c55e';
const SHORT_RED = '#ef4444';

describe('SkinService', () => {
  beforeEach(() => {
    useCosmeticsStore.getState().reset();
    InventoryService.resetForTests();
    SkinService.resetForTests();
  });

  describe('default skin (position passthrough)', () => {
    it('resolves every color layer to the market-position color', () => {
      const visuals = SkinService.getVisuals(LONG_GREEN);

      expect(visuals.skinId).toBe('default');
      expect(visuals.bodyColor).toBe(LONG_GREEN);
      expect(visuals.trailColor).toBe(LONG_GREEN);
      expect(visuals.glowColor).toBe(LONG_GREEN);
      expect(visuals.accentColor).toBe(LONG_GREEN);
      expect(visuals.coreColor).toBe('#FFFFFF');
      expect(visuals.outlineColor).toBe('#FFFFFF');
    });

    it('tracks position color changes (LONG -> SHORT)', () => {
      SkinService.getVisuals(LONG_GREEN);
      const visuals = SkinService.getVisuals(SHORT_RED);

      expect(visuals.bodyColor).toBe(SHORT_RED);
      expect(visuals.trailColor).toBe(SHORT_RED);
    });

    it('returns the same pre-allocated struct on every call (zero-alloc contract)', () => {
      const first = SkinService.getVisuals(LONG_GREEN);
      const second = SkinService.getVisuals(LONG_GREEN);
      const third = SkinService.getVisuals(SHORT_RED);

      expect(second).toBe(first);
      expect(third).toBe(first);
    });
  });

  describe('equip', () => {
    it('rejects equipping an unowned skin', () => {
      expect(SkinService.equip('satoshi_ghost')).toBe(false);
      expect(SkinService.getActiveSkinId()).toBe('default');
    });

    it('equips an owned skin and applies its palette over the position color', () => {
      useCosmeticsStore.getState().addOwnedSkin('satoshi_ghost');

      expect(SkinService.equip('satoshi_ghost')).toBe(true);
      expect(SkinService.getActiveSkinId()).toBe('satoshi_ghost');

      const visuals = SkinService.getVisuals(LONG_GREEN);
      const definition = SKIN_VISUAL_REGISTRY.satoshi_ghost;
      expect(visuals.bodyColor).toBe(definition.bodyColor);
      expect(visuals.glowColor).toBe(definition.glowColor);
      // Position signal must survive skinning:
      expect(visuals.trailColor).toBe(LONG_GREEN);
      expect(visuals.accentColor).toBe(LONG_GREEN);
    });

    it('persists the equipped skin to the cosmetics store', () => {
      useCosmeticsStore.getState().addOwnedSkin('degen_ape');
      SkinService.equip('degen_ape');

      expect(useCosmeticsStore.getState().equippedSkinId).toBe('degen_ape');
    });

    it('emits skinEquipped with the previous skin id', () => {
      const handler = vi.fn();
      const unsubscribe = EventBus.on('skinEquipped', handler);
      useCosmeticsStore.getState().addOwnedSkin('laser_eyes');

      SkinService.equip('laser_eyes');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ skinId: 'laser_eyes', previousSkinId: 'default' })
      );
      unsubscribe();
    });

    it('notifies onChange listeners and honors unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = SkinService.onChange(listener);
      useCosmeticsStore.getState().addOwnedSkin('vitalik_mode');

      SkinService.equip('vitalik_mode');
      expect(listener).toHaveBeenCalledWith('vitalik_mode');

      unsubscribe();
      useCosmeticsStore.getState().addOwnedSkin('solana_sage');
      SkinService.equip('solana_sage');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('inventory integration', () => {
    it('follows the InventoryService equip path via the skinEquipped event', () => {
      InventoryService.setPlayer('p1');
      InventoryService.unlockSkin('diamond_hands');
      InventoryService.equipSkin('diamond_hands');

      expect(SkinService.getActiveSkinId()).toBe('diamond_hands');
      expect(useCosmeticsStore.getState().equippedSkinId).toBe('diamond_hands');
    });

    it('persists lootbox unlocks into the cosmetics store ownership', () => {
      InventoryService.setPlayer('p1');
      InventoryService.unlockSkin('whale_watcher');

      expect(useCosmeticsStore.getState().ownedSkinIds).toContain('whale_watcher');
      // Owned via the persistent path, so the cosmetics equip works too:
      expect(SkinService.equip('whale_watcher')).toBe(true);
    });
  });

  describe('hydration', () => {
    it('restores the persisted equipped skin when owned', () => {
      useCosmeticsStore.getState().addOwnedSkin('solana_sage');
      useCosmeticsStore.getState().setEquippedSkin('solana_sage');

      SkinService.resetForTests(); // re-hydrates from the store

      expect(SkinService.getActiveSkinId()).toBe('solana_sage');
    });

    it('falls back to default when the persisted skin is not owned (localStorage tampering)', () => {
      useCosmeticsStore.getState().setEquippedSkin('satoshi_ghost');

      SkinService.resetForTests();

      expect(SkinService.getActiveSkinId()).toBe('default');
    });

    it('falls back to default for unknown persisted skin ids', () => {
      useCosmeticsStore.getState().addOwnedSkin('bogus_skin' as any);
      useCosmeticsStore.getState().setEquippedSkin('bogus_skin' as any);

      SkinService.resetForTests();

      expect(SkinService.getActiveSkinId()).toBe('default');
    });
  });
});
