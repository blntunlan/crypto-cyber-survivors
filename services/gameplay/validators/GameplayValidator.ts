import { META_UPGRADE_REGISTRY } from '../../../config/MetaUpgradeRegistry';
import { type MetaUpgradeDef } from '../../../types/metaProgression';
import { type CharacterSkinId } from '../../../types/lootbox';
import {
  CHARACTER_SKIN_DEFINITIONS,
  CONSUMABLE_DEFINITIONS,
  CRYPTO_TOKEN_DEFINITIONS,
  type InventoryItemType,
} from '../../../types/inventory';
import { type GameplayValidationIssue, type GameplayValidationResult } from './types';

const VALID_INVENTORY_ITEM_TYPES: ReadonlySet<string> = new Set([
  'consumable',
  'character_skin',
  'crypto_token',
]);

type MetaUpgradePurchaseInput = {
  upgradeId: string;
  currentLevel: number;
  metaCoins: number;
  serverNewLevel?: number;
  serverNewMetaCoins?: number;
  serverCost?: number;
};

type InventoryGrantInput = {
  itemType: InventoryItemType | string;
  itemId: string;
  quantity: number;
  currentQuantity?: number;
  maxStack?: number;
  allowFractionalQuantity?: boolean;
};

type ConsumableUseInput = {
  itemId: string;
  currentQuantity: number;
};

type SkinEquipInput = {
  skinId: CharacterSkinId;
  ownedSkinIds: CharacterSkinId[];
};

function makeResult(issues: GameplayValidationIssue[]): GameplayValidationResult {
  return {
    valid: !issues.some(issue => issue.severity === 'fail'),
    issues,
  };
}

function fail(
  validator: string,
  reason: string,
  value?: number | string,
  expected?: number | string
): GameplayValidationIssue {
  return { validator, severity: 'fail', reason, value, expected };
}

function warn(
  validator: string,
  reason: string,
  value?: number | string,
  expected?: number | string
): GameplayValidationIssue {
  return { validator, severity: 'warn', reason, value, expected };
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function isPositiveQuantity(value: number, allowFractional: boolean): boolean {
  if (!Number.isFinite(value) || value <= 0) return false;
  return allowFractional || Number.isInteger(value);
}

export class GameplayValidator {
  static validateMetaUpgradePurchase(
    input: MetaUpgradePurchaseInput
  ): GameplayValidationResult {
    const issues: GameplayValidationIssue[] = [];
    const registry: Partial<Record<string, MetaUpgradeDef>> = META_UPGRADE_REGISTRY;
    const def = registry[input.upgradeId];

    if (!def) {
      issues.push(fail('meta_upgrade', 'Unknown upgrade id', input.upgradeId));
      return makeResult(issues);
    }

    if (!isNonNegativeInteger(input.currentLevel)) {
      issues.push(
        fail(
          'meta_upgrade',
          'Current level must be a non-negative integer',
          input.currentLevel
        )
      );
      return makeResult(issues);
    }

    if (!isNonNegativeInteger(input.metaCoins)) {
      issues.push(
        fail(
          'meta_upgrade',
          'Meta coin balance must be a non-negative integer',
          input.metaCoins
        )
      );
    }

    if (input.currentLevel >= def.maxLevel) {
      issues.push(
        fail(
          'meta_upgrade',
          'Upgrade is already at max level',
          input.currentLevel,
          def.maxLevel
        )
      );
      return makeResult(issues);
    }

    const expectedCost = def.costPerLevel[input.currentLevel];
    if (
      !Number.isFinite(expectedCost) ||
      expectedCost === undefined ||
      expectedCost <= 0
    ) {
      issues.push(
        fail('meta_upgrade', 'Upgrade level has no valid cost', input.currentLevel)
      );
      return makeResult(issues);
    }

    if (input.metaCoins < expectedCost) {
      issues.push(
        fail(
          'meta_upgrade',
          'Insufficient meta coin balance',
          input.metaCoins,
          expectedCost
        )
      );
    }

    const expectedNewLevel = input.currentLevel + 1;
    const expectedNewMetaCoins = input.metaCoins - expectedCost;

    if (input.serverCost !== undefined && input.serverCost !== expectedCost) {
      issues.push(
        fail(
          'meta_upgrade_server',
          'Server cost mismatch',
          input.serverCost,
          expectedCost
        )
      );
    }

    if (
      input.serverNewLevel !== undefined &&
      input.serverNewLevel !== expectedNewLevel
    ) {
      issues.push(
        fail(
          'meta_upgrade_server',
          'Server level increment mismatch',
          input.serverNewLevel,
          expectedNewLevel
        )
      );
    }

    if (
      input.serverNewMetaCoins !== undefined &&
      input.serverNewMetaCoins !== expectedNewMetaCoins
    ) {
      issues.push(
        fail(
          'meta_upgrade_server',
          'Server meta coin balance mismatch',
          input.serverNewMetaCoins,
          expectedNewMetaCoins
        )
      );
    }

    return makeResult(issues);
  }

  static validateInventoryGrant(input: InventoryGrantInput): GameplayValidationResult {
    const issues: GameplayValidationIssue[] = [];

    if (!VALID_INVENTORY_ITEM_TYPES.has(input.itemType)) {
      issues.push(fail('inventory', 'Unknown inventory item type', input.itemType));
    }

    if (!input.itemId.trim()) {
      issues.push(fail('inventory', 'Item id cannot be empty', input.itemId));
    } else if (
      input.itemType === 'consumable' &&
      !(input.itemId in CONSUMABLE_DEFINITIONS)
    ) {
      issues.push(fail('inventory', 'Unknown consumable id', input.itemId));
    } else if (
      input.itemType === 'character_skin' &&
      !(input.itemId in CHARACTER_SKIN_DEFINITIONS)
    ) {
      issues.push(fail('inventory', 'Unknown character skin id', input.itemId));
    } else if (
      input.itemType === 'crypto_token' &&
      !(input.itemId in CRYPTO_TOKEN_DEFINITIONS)
    ) {
      issues.push(fail('inventory', 'Unknown crypto token id', input.itemId));
    }

    if (!isPositiveQuantity(input.quantity, input.allowFractionalQuantity === true)) {
      issues.push(
        fail('inventory', 'Quantity must be a positive finite amount', input.quantity)
      );
    }

    if (
      input.currentQuantity !== undefined &&
      !isNonNegativeInteger(input.currentQuantity)
    ) {
      issues.push(
        fail(
          'inventory',
          'Current quantity must be a non-negative integer',
          input.currentQuantity
        )
      );
    }

    if (input.maxStack !== undefined) {
      if (!Number.isInteger(input.maxStack) || input.maxStack <= 0) {
        issues.push(
          fail('inventory', 'Max stack must be a positive integer', input.maxStack)
        );
      } else if (
        input.currentQuantity !== undefined &&
        input.currentQuantity + input.quantity > input.maxStack
      ) {
        issues.push(
          warn(
            'inventory',
            'Grant exceeds max stack and will be capped',
            input.currentQuantity + input.quantity,
            input.maxStack
          )
        );
      }
    }

    return makeResult(issues);
  }

  static validateConsumableUse(input: ConsumableUseInput): GameplayValidationResult {
    const issues: GameplayValidationIssue[] = [];

    if (!input.itemId.trim()) {
      issues.push(fail('inventory_use', 'Item id cannot be empty', input.itemId));
    }

    if (!Number.isInteger(input.currentQuantity) || input.currentQuantity <= 0) {
      issues.push(
        fail(
          'inventory_use',
          'Consumable is not available',
          input.currentQuantity,
          '>= 1'
        )
      );
    }

    return makeResult(issues);
  }

  static validateSkinEquip(input: SkinEquipInput): GameplayValidationResult {
    const issues: GameplayValidationIssue[] = [];

    if (!input.skinId.trim()) {
      issues.push(fail('skin_equip', 'Skin id cannot be empty', input.skinId));
      return makeResult(issues);
    }

    if (input.skinId !== 'default' && !input.ownedSkinIds.includes(input.skinId)) {
      issues.push(fail('skin_equip', 'Skin is not owned', input.skinId));
    }

    return makeResult(issues);
  }
}
