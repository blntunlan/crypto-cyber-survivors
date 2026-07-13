/**
 * SkinService - Runtime authority for the active character skin
 *
 * Bridges cosmetic state (cosmeticsStore + inventory events) into the
 * non-React render loop, mirroring the ThemeService pattern.
 *
 * Hot-path contract: getVisuals() returns one pre-allocated struct that is
 * recomputed only when the skin or the market-position color changes —
 * safe to call every frame from EntityRenderer with zero allocations.
 *
 * Equip paths (both converge on the `skinEquipped` event):
 * - SkinService.equip(id)            — hub UI, validated against the
 *   persisted cosmetics store ownership.
 * - InventoryService.equipSkin(id)   — legacy in-memory inventory path.
 *
 * Usage:
 *   SkinService.equip('satoshi_ghost');             // UI
 *   const v = SkinService.getVisuals(player.color); // render loop
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { GameplayValidator } from '../gameplay/validators';
import { type CharacterSkinId } from '../../types/lootbox';
import { type ResolvedSkinVisuals, type SkinVisualDefinition } from '../../types/skins';
import { DEFAULT_SKIN_ID, SKIN_VISUAL_REGISTRY } from '../../config/SkinRegistry';
import { useCosmeticsStore } from '../../stores/cosmeticsStore';

const WHITE = '#FFFFFF';

class SkinServiceClass {
  private activeSkinId: CharacterSkinId = DEFAULT_SKIN_ID;
  private lastPositionColor = '';
  private listeners: Set<(skinId: CharacterSkinId) => void> = new Set();

  /** Single mutable struct handed to the render loop (zero-alloc hot path). */
  private readonly resolved: ResolvedSkinVisuals = {
    skinId: DEFAULT_SKIN_ID,
    bodyColor: WHITE,
    trailColor: WHITE,
    glowColor: WHITE,
    accentColor: WHITE,
    coreColor: WHITE,
    outlineColor: WHITE,
  };

  constructor() {
    this.hydrateFromStore();

    // Every equip path (InventoryService.equipSkin, SkinService.equip)
    // emits skinEquipped, so activation has exactly one entry point.
    EventBus.subscribe('skinEquipped', data => this.activate(data.skinId));

    // Unlocks (lootbox drops, achievements) flow into persistent ownership.
    EventBus.subscribe('skinUnlocked', data => {
      useCosmeticsStore.getState().addOwnedSkin(data.skinId);
    });
    EventBus.subscribe('inventoryUpdated', data => {
      if (data.itemType !== 'character_skin' || data.action !== 'unlock') return;
      const skinId = data.itemId as CharacterSkinId;
      if (skinId in SKIN_VISUAL_REGISTRY) {
        useCosmeticsStore.getState().addOwnedSkin(skinId);
      }
    });
  }

  // ===========================================================================
  // EQUIP / QUERY
  // ===========================================================================

  /**
   * Equip a skin through the persistent cosmetics path (hub UI entry point).
   * Ownership is validated against the cosmetics store.
   */
  equip(skinId: CharacterSkinId): boolean {
    const validation = GameplayValidator.validateSkinEquip({
      skinId,
      ownedSkinIds: useCosmeticsStore.getState().ownedSkinIds,
    });
    if (!validation.valid) {
      Logger.warn(`[SkinService] Equip rejected, skin not owned: ${skinId}`);
      return false;
    }

    const previousSkinId = this.activeSkinId;
    if (previousSkinId === skinId) return true;

    EventBus.emit('skinEquipped', { skinId, previousSkinId });
    return true;
  }

  getActiveSkinId(): CharacterSkinId {
    return this.activeSkinId;
  }

  /**
   * Renderer entry point. `positionColor` is the market-position color
   * (player.color, green LONG / red SHORT); skin layers without an
   * override inherit it. Returns the shared pre-allocated struct.
   */
  getVisuals(positionColor: string): ResolvedSkinVisuals {
    if (positionColor !== this.lastPositionColor) {
      this.lastPositionColor = positionColor;
      this.recompute();
    }
    return this.resolved;
  }

  /**
   * Subscribe to skin changes (for React UI via useEquippedSkin).
   */
  onChange(callback: (skinId: CharacterSkinId) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  private activate(skinId: CharacterSkinId): void {
    if (!(skinId in SKIN_VISUAL_REGISTRY)) {
      Logger.warn(`[SkinService] Unknown skin id ignored: ${skinId}`);
      return;
    }
    this.activeSkinId = skinId;
    useCosmeticsStore.getState().setEquippedSkin(skinId);
    this.recompute();
    this.listeners.forEach(listener => listener(skinId));
  }

  /**
   * Restore the persisted equipped skin. Falls back to default when the
   * persisted id is unknown or (per validator) not in the owned list —
   * localStorage edits cannot equip unowned skins.
   */
  private hydrateFromStore(): void {
    const { equippedSkinId, ownedSkinIds } = useCosmeticsStore.getState();
    const validation = GameplayValidator.validateSkinEquip({
      skinId: equippedSkinId,
      ownedSkinIds,
    });
    this.activeSkinId =
      validation.valid && equippedSkinId in SKIN_VISUAL_REGISTRY
        ? equippedSkinId
        : DEFAULT_SKIN_ID;
    this.recompute();
  }

  private recompute(): void {
    const def: SkinVisualDefinition = SKIN_VISUAL_REGISTRY[this.activeSkinId];
    const position = this.lastPositionColor || WHITE;
    const r = this.resolved;
    r.skinId = this.activeSkinId;
    r.bodyColor = def.bodyColor ?? position;
    r.trailColor = def.trailColor ?? position;
    r.glowColor = def.glowColor ?? position;
    r.accentColor = def.accentColor ?? position;
    r.coreColor = def.coreColor ?? WHITE;
    r.outlineColor = def.outlineColor ?? WHITE;
  }

  // ===========================================================================
  // TESTING
  // ===========================================================================

  /**
   * Resets runtime state and re-hydrates from the cosmetics store
   * (for testing only — reset the store first for a clean slate).
   */
  resetForTests(): void {
    this.lastPositionColor = '';
    this.listeners.clear();
    this.hydrateFromStore();
  }
}

// Singleton export (module-const pattern, same as ThemeService)
export const SkinService = new SkinServiceClass();
