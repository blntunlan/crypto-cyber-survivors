/**
 * InventoryService - Player inventory management
 *
 * Manages player-owned items including consumables,
 * character skins, and collected crypto tokens.
 *
 * Usage:
 *   InventoryService.addItem('consumable', 'flash_loan', 1);
 *   InventoryService.useConsumable('flash_loan');
 *   InventoryService.equipSkin('satoshi_ghost');
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import {
  type PlayerInventory,
  type ConsumableItem,
  type CharacterSkinItem,
  type CryptoTokenItem,
  type InventoryItemType,
  CONSUMABLE_DEFINITIONS,
  CHARACTER_SKIN_DEFINITIONS,
  createEmptyInventory,
} from '../../types/inventory';
import { type CharacterSkinId, type ConsumableEffectType } from '../../types/lootbox';
import { nanoid } from 'nanoid';
import { GameplayValidator } from '../gameplay/validators';
import { TimeService } from '../core/TimeService';

// =============================================================================
// INVENTORY SERVICE CLASS
// =============================================================================

class InventoryServiceClass {
  // In-memory storage (will be synced with Railway later)
  private inventories: Map<string, PlayerInventory> = new Map();
  private currentPlayerId: string | null = null;

  // Active consumable effects
  private activeEffects: Map<ConsumableEffectType, { endTime: number; value: number }> =
    new Map();

  constructor() {
    // Subscribe to game reset
    EventBus.subscribe('gameReset', () => this.handleGameReset());

    // Subscribe to lootbox item events
    EventBus.subscribe('inventoryItemAdded', data => {
      this.addItem(data.itemType, data.itemId, data.quantity);
    });

    EventBus.subscribe('skinUnlocked', data => {
      this.unlockSkin(data.skinId);
    });
  }

  // ===========================================================================
  // PLAYER CONTEXT
  // ===========================================================================

  /**
   * Set the current player ID and load/create inventory
   */
  setPlayer(playerId: string): void {
    this.currentPlayerId = playerId;
    if (!this.inventories.has(playerId)) {
      this.inventories.set(playerId, createEmptyInventory(playerId));
    }
    Logger.info(`[InventoryService] Player set: ${playerId}`);
  }

  /**
   * Get current player's inventory
   */
  getInventory(): PlayerInventory | null {
    if (!this.currentPlayerId) return null;
    return this.inventories.get(this.currentPlayerId) ?? null;
  }

  // ===========================================================================
  // ADDING ITEMS
  // ===========================================================================

  /**
   * Add an item to the player's inventory
   */
  addItem(itemType: InventoryItemType, itemId: string, quantity: number = 1): boolean {
    const inventory = this.getInventory();
    if (!inventory) {
      Logger.warn('[InventoryService] No inventory available');
      return false;
    }

    const validation = GameplayValidator.validateInventoryGrant({
      itemType,
      itemId,
      quantity,
      allowFractionalQuantity: itemType === 'crypto_token',
    });
    if (!validation.valid) {
      Logger.warn('[InventoryService] Rejected invalid inventory grant', {
        itemType,
        itemId,
        quantity,
        issues: validation.issues,
      });
      return false;
    }

    switch (itemType) {
      case 'consumable':
        return this.addConsumable(inventory, itemId, quantity);

      case 'character_skin':
        return this.addSkin(inventory, itemId as CharacterSkinId);

      case 'crypto_token':
        return this.addCryptoToken(inventory, itemId, quantity);

      default:
        Logger.warn(`[InventoryService] Unknown item type: ${itemType}`);
        return false;
    }
  }

  private addConsumable(
    inventory: PlayerInventory,
    itemId: string,
    quantity: number
  ): boolean {
    const definition = CONSUMABLE_DEFINITIONS[itemId];
    if (!definition) {
      Logger.warn(`[InventoryService] Unknown consumable: ${itemId}`);
      return false;
    }

    // Find existing stack
    const existing = inventory.consumables.find(c => c.itemId === itemId);
    const validation = GameplayValidator.validateInventoryGrant({
      itemType: 'consumable',
      itemId,
      quantity,
      currentQuantity: existing?.quantity ?? 0,
      maxStack: definition.maxStack,
    });
    if (!validation.valid) {
      Logger.warn('[InventoryService] Rejected invalid consumable grant', {
        itemId,
        quantity,
        issues: validation.issues,
      });
      return false;
    }

    if (existing) {
      // Check max stack
      const newQuantity = Math.min(existing.quantity + quantity, definition.maxStack);
      existing.quantity = newQuantity;
    } else {
      // Create new item
      const item: ConsumableItem = {
        id: this.generateId(),
        playerId: inventory.playerId,
        itemType: 'consumable',
        itemId,
        quantity: Math.min(quantity, definition.maxStack),
        obtainedAt: new Date(),
        effectType: definition.effectType,
        effectValue: definition.effectValue,
        duration: definition.duration,
      };
      inventory.consumables.push(item);
    }

    inventory.lastUpdated = new Date();
    Logger.info(`[InventoryService] Added ${quantity}x ${definition.name}`);

    EventBus.emit('inventoryUpdated', {
      itemType: 'consumable',
      itemId,
      action: 'add',
    });

    return true;
  }

  private addSkin(inventory: PlayerInventory, skinId: CharacterSkinId): boolean {
    // CHARACTER_SKIN_DEFINITIONS always has all skin IDs due to Record type
    const definition = CHARACTER_SKIN_DEFINITIONS[skinId];

    // Check if already owned
    if (inventory.skins.some(s => s.skinId === skinId)) {
      Logger.debug(`[InventoryService] Skin already owned: ${skinId}`);
      // Could award duplicate compensation here
      return false;
    }

    const item: CharacterSkinItem = {
      id: this.generateId(),
      playerId: inventory.playerId,
      itemType: 'character_skin',
      itemId: `skin_${skinId}`,
      quantity: 1,
      obtainedAt: new Date(),
      skinId,
      equipped: false,
    };

    inventory.skins.push(item);
    inventory.lastUpdated = new Date();

    Logger.info(`[InventoryService] Unlocked skin: ${definition.name}`);

    EventBus.emit('inventoryUpdated', {
      itemType: 'character_skin',
      itemId: skinId,
      action: 'unlock',
    });

    return true;
  }

  private addCryptoToken(
    inventory: PlayerInventory,
    tokenType: string,
    amount: number
  ): boolean {
    // Find existing token of same type
    const existing = inventory.cryptoTokens.find(t => t.tokenType === tokenType);
    if (existing) {
      existing.amount += amount;
    } else {
      const item: CryptoTokenItem = {
        id: this.generateId(),
        playerId: inventory.playerId,
        itemType: 'crypto_token',
        itemId: `token_${tokenType}`,
        quantity: 1,
        obtainedAt: new Date(),
        tokenType: tokenType as 'BTC' | 'ETH' | 'SOL',
        amount,
      };
      inventory.cryptoTokens.push(item);
    }

    inventory.lastUpdated = new Date();
    Logger.info(`[InventoryService] Added ${amount} ${tokenType}`);

    return true;
  }

  // ===========================================================================
  // USING CONSUMABLES
  // ===========================================================================

  /**
   * Use a consumable item
   */
  useConsumable(itemId: string): boolean {
    const inventory = this.getInventory();
    if (!inventory) return false;

    const item = inventory.consumables.find(c => c.itemId === itemId && c.quantity > 0);
    const validation = GameplayValidator.validateConsumableUse({
      itemId,
      currentQuantity: item?.quantity ?? 0,
    });
    if (!item || !validation.valid) {
      Logger.warn(`[InventoryService] Consumable not available: ${itemId}`);
      return false;
    }

    const definition = CONSUMABLE_DEFINITIONS[itemId];
    if (!definition) return false;

    // Consume one item
    item.quantity--;

    // Remove if empty
    if (item.quantity <= 0) {
      inventory.consumables = inventory.consumables.filter(c => c.id !== item.id);
    }

    // Apply effect
    this.applyConsumableEffect(
      definition.effectType,
      definition.effectValue,
      definition.duration
    );

    Logger.info(
      `[InventoryService] Used ${definition.name}, ${item.quantity} remaining`
    );

    EventBus.emit('consumableUsed', {
      itemId,
      effectType: definition.effectType,
      effectValue: definition.effectValue,
      duration: definition.duration,
    });

    return true;
  }

  /**
   * Apply a consumable effect
   */
  private applyConsumableEffect(
    effectType: ConsumableEffectType,
    value: number,
    duration?: number
  ): void {
    switch (effectType) {
      case 'kill_all':
        EventBus.emit('killAll', {});
        break;

      case 'full_heal':
        EventBus.emit('playerHealed', {
          amount: 9999,
          x: 0,
          y: 0,
          source: 'pickup',
        });
        break;

      case 'revive':
        // Store revive flag - will be checked on death
        this.setActiveEffect('revive', value, -1); // Permanent until used
        break;

      case 'damage_boost':
      case 'speed_boost':
      case 'xp_boost':
      case 'coin_boost':
        // Timed effects
        if (duration) {
          this.setActiveEffect(effectType, value, TimeService.getGameTime() + duration);
        }
        break;
    }
  }

  private setActiveEffect(
    effectType: ConsumableEffectType,
    value: number,
    endTime: number
  ): void {
    this.activeEffects.set(effectType, { endTime, value });
    Logger.debug(`[InventoryService] Active effect: ${effectType} = ${value}`);
  }

  /**
   * Get active effect multiplier
   */
  getEffectMultiplier(effectType: ConsumableEffectType): number {
    const effect = this.activeEffects.get(effectType);
    if (!effect) return 1.0;

    // Check if expired
    if (effect.endTime !== -1 && TimeService.getGameTime() > effect.endTime) {
      this.activeEffects.delete(effectType);
      return 1.0;
    }

    return effect.value;
  }

  /**
   * Check if player has revive available
   */
  hasRevive(): boolean {
    return this.activeEffects.has('revive');
  }

  /**
   * Consume revive (called on death)
   */
  consumeRevive(): boolean {
    if (!this.hasRevive()) return false;
    this.activeEffects.delete('revive');
    Logger.info('[InventoryService] Revive consumed!');
    return true;
  }

  // ===========================================================================
  // CHARACTER SKINS
  // ===========================================================================

  /**
   * Unlock a skin (called from lootbox)
   */
  unlockSkin(skinId: CharacterSkinId): boolean {
    return this.addItem('character_skin', skinId, 1);
  }

  /**
   * Equip a skin
   */
  equipSkin(skinId: CharacterSkinId): boolean {
    const inventory = this.getInventory();
    if (!inventory) return false;

    const validation = GameplayValidator.validateSkinEquip({
      skinId,
      ownedSkinIds: this.getOwnedSkins(),
    });
    if (!validation.valid) {
      Logger.warn(`[InventoryService] Skin not owned: ${skinId}`);
      return false;
    }

    const previousSkin = inventory.equippedSkin;

    // Unequip all
    inventory.skins.forEach(s => (s.equipped = false));

    // Equip new skin
    const skin = inventory.skins.find(s => s.skinId === skinId);
    if (skin) skin.equipped = true;

    inventory.equippedSkin = skinId;
    inventory.lastUpdated = new Date();

    Logger.info(`[InventoryService] Equipped skin: ${skinId}`);

    EventBus.emit('skinEquipped', {
      skinId,
      previousSkinId: previousSkin,
    });

    return true;
  }

  /**
   * Get currently equipped skin
   */
  getEquippedSkin(): CharacterSkinId {
    const inventory = this.getInventory();
    return inventory?.equippedSkin ?? 'default';
  }

  /**
   * Get all owned skins
   */
  getOwnedSkins(): CharacterSkinId[] {
    const inventory = this.getInventory();
    if (!inventory) return ['default'];

    return ['default', ...inventory.skins.map(s => s.skinId)];
  }

  // ===========================================================================
  // QUERIES
  // ===========================================================================

  /**
   * Get consumable count
   */
  getConsumableCount(itemId: string): number {
    const inventory = this.getInventory();
    if (!inventory) return 0;

    const item = inventory.consumables.find(c => c.itemId === itemId);
    return item?.quantity ?? 0;
  }

  /**
   * Get all consumables
   */
  getConsumables(): Array<{
    itemId: string;
    quantity: number;
    definition: (typeof CONSUMABLE_DEFINITIONS)[string];
  }> {
    const inventory = this.getInventory();
    if (!inventory) return [];

    return inventory.consumables
      .map(c => ({
        itemId: c.itemId,
        quantity: c.quantity,
        definition: CONSUMABLE_DEFINITIONS[c.itemId],
      }))
      .filter(
        (
          item
        ): item is {
          itemId: string;
          quantity: number;
          definition: (typeof CONSUMABLE_DEFINITIONS)[string];
        } => item.definition !== undefined
      );
  }

  /**
   * Get crypto token amounts
   */
  getCryptoTokens(): Array<{ tokenType: string; amount: number }> {
    const inventory = this.getInventory();
    if (!inventory) return [];

    return inventory.cryptoTokens.map(t => ({
      tokenType: t.tokenType,
      amount: t.amount,
    }));
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  private generateId(): string {
    return `inv_${Date.now()}_${nanoid(10)}`;
  }

  private handleGameReset(): void {
    // Clear timed effects, keep permanent items
    this.activeEffects.clear();
    Logger.debug('[InventoryService] Active effects cleared');
  }

  // ===========================================================================
  // DEBUG
  // ===========================================================================

  /**
   * Get debug state
   */
  getDebugState(): Record<string, unknown> {
    const inventory = this.getInventory();
    return {
      playerId: this.currentPlayerId,
      consumables: inventory?.consumables.length ?? 0,
      skins: inventory?.skins.length ?? 0,
      cryptoTokens: inventory?.cryptoTokens.length ?? 0,
      equippedSkin: inventory?.equippedSkin ?? 'default',
      activeEffects: Object.fromEntries(this.activeEffects),
    };
  }

  /**
   * Debug: Add test item
   */
  debugAddItem(itemId: string): void {
    this.addItem('consumable', itemId, 1);
  }

  /**
   * Resets local state (for testing only)
   */
  resetForTests(): void {
    this.inventories.clear();
    this.activeEffects.clear();
    this.currentPlayerId = null;
  }
}

// Singleton export
export const InventoryService = new InventoryServiceClass();
