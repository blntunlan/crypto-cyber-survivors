# 🎁 Lootbox & Inventory System

> Crypto-themed lootbox system with character skins, consumables, and crypto token rewards.

## 📦 Lootbox Types

| Rarity | Name | Theme | Icon | Glow Color |
|--------|------|-------|------|------------|
| **Common** | Mining Crate | BTC Mining | ⛏️ | Orange |
| **Rare** | Gas Fee Box | ETH Gas | ⛽ | Purple-Blue |
| **Epic** | Validator Vault | Solana Staking | 🔐 | Purple |
| **Legendary** | Whale Wallet | Crypto Whales | 🐋 | Gold |
| **Special** | Flash Crash Crate | Volatility Event | 📉 | Red |
| **Special** | Whale Hunter Box | Defeat Whale | 🎯 | Green |

## 🎰 Drop Categories & Rates

### Drop Rate by Lootbox Rarity

| Category | Common | Rare | Epic | Legendary |
|----------|--------|------|------|-----------|
| 💰 Coins | 70% | 50% | 35% | 20% |
| ⚡ Consumables | 25% | 35% | 35% | 30% |
| 🎭 Character Skins | 5% | 15% | 30% | 50% |
| ₿ Crypto Tokens | 0%* | 0%* | 0%* | 0%* |

*\* Crypto token drops are advertised as "ultra rare" but have 0% actual drop rate (marketing feature)*

## 💰 Coin Drops

| Drop Name | Rarity | Amount Range |
|-----------|--------|--------------|
| Small Coin Pouch | Common | 50-100 |
| Coin Bag | Rare | 200-500 |
| Coin Chest | Epic | 1,000-2,500 |
| Jackpot Vault | Legendary | 5,000-10,000 |

## ⚡ Consumable Items

| Item | Effect | Duration | Rarity |
|------|--------|----------|--------|
| ⚡ Flash Loan | 2x Damage | 10s | Common |
| ⛽ Gas Boost | +50% Speed | 15s | Rare |
| 📜 Smart Contract | Kill All Enemies | Instant | Epic |
| 🥩 Staking Reward | Full HP Restore | Instant | Rare |
| 🛡️ Rug Pull Protection | Survive Fatal Hit | Auto | Legendary |
| 💎 Diamond Hands Boost | +50% XP | 30s | Rare |
| 🌙 Moon Bag | +100% Coins | 20s | Epic |

## 🎭 Character Skins

### Unlockable via Lootbox

| Skin | Rarity | Icon | Color |
|------|--------|------|-------|
| Diamond Hands Holder | Rare | 💎 | Cyan |
| Whale Watcher | Rare | 🐋 | Blue |
| Degen Ape | Epic | 🦍 | Brown |
| Laser Eyes | Epic | 👁️ | Red |
| **Satoshi's Ghost** | Legendary | 👻 | BTC Orange |
| **Vitalik Mode** | Legendary | Ξ | ETH Purple |
| **Solana Sage** | Legendary | ◎ | SOL Purple |

## 🎮 How to Earn Lootboxes

### Cycle Completion Rewards

| Cycle | Reward |
|-------|--------|
| Cycle 1 | Mining Crate (Common) |
| Cycle 2 | Gas Fee Box (Rare) |
| Cycle 3 | Validator Vault (Epic) |
| Cycle 5+ | Whale Wallet (Legendary) |

### Wave Milestones
- Every 5 waves: 25% chance for Mining Crate

### Kill Streak Rewards

| Streak | Reward |
|--------|--------|
| 100 kills | Mining Crate |
| 250 kills | Gas Fee Box |
| 500 kills | Validator Vault |

### Special Events
- **Flash Crash Crate**: Awarded during high volatility market events
- **Whale Hunter Box**: Awarded for surviving Whale Tier 3 attacks

## 🏗️ Architecture

### Services

```
services/lootbox/
├── LootboxService.ts       # Core management (earning, opening)
├── LootboxDropCalculator.ts # Weighted RNG drop calculation
├── LootboxDropPools.ts     # All possible drops
└── index.ts                # Public exports

services/inventory/
├── InventoryService.ts     # Item management, consumable effects
└── index.ts                # Public exports
```

### Type Definitions

```
types/
├── lootbox.ts    # LootboxType, LootboxDrop, DropCategory
└── inventory.ts  # PlayerInventory, ConsumableItem, CharacterSkinItem
```

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `lootboxEarned` | `{ boxType, rarity, source }` | Player earned a lootbox |
| `lootboxOpening` | `{ lootboxId, boxType }` | Opening animation started |
| `lootboxOpened` | `{ lootboxId, drop, isJackpot }` | Drop revealed |
| `inventoryItemAdded` | `{ itemType, itemId, quantity }` | Item added |
| `inventoryUpdated` | `{ itemType, itemId, action }` | Inventory changed |
| `consumableUsed` | `{ itemId, effectType, effectValue }` | Consumable activated |
| `skinUnlocked` | `{ skinId }` | New skin unlocked |
| `skinEquipped` | `{ skinId, previousSkinId }` | Skin changed |

## 🔧 Usage

### Earning Lootboxes

```typescript
import { LootboxService } from './services/lootbox';

// Set player context
LootboxService.setPlayer('player_123');

// Award from cycle completion
LootboxService.awardCycleReward(2); // Gives Gas Fee Box

// Check wave milestone
LootboxService.checkWaveMilestone(10); // 25% chance for Mining Crate

// Check kill streak
LootboxService.checkKillStreakReward(250); // Gives Gas Fee Box
```

### Opening Lootboxes

```typescript
// Get unopened lootboxes
const lootboxes = LootboxService.getUnopenedLootboxes();

// Open one
const result = await LootboxService.openLootbox(lootboxes[0].id);
console.log(result.drop); // { name: "Diamond Hands Holder", category: "character_skin", ... }
```

### Using Inventory

```typescript
import { InventoryService } from './services/inventory';

// Set player
InventoryService.setPlayer('player_123');

// Use a consumable
InventoryService.useConsumable('flash_loan'); // 2x damage for 10s

// Get effect multiplier
const damageMultiplier = InventoryService.getEffectMultiplier('damage_boost');

// Equip a skin
InventoryService.equipSkin('satoshi_ghost');
```

## 📊 Database Schema (Supabase)

```sql
-- Lootbox inventory
CREATE TABLE player_lootboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id),
  box_type text NOT NULL,
  rarity text NOT NULL,
  source text NOT NULL,
  obtained_at timestamptz DEFAULT now(),
  opened boolean DEFAULT false,
  opened_at timestamptz
);

-- Player items
CREATE TABLE player_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id),
  item_type text NOT NULL,
  item_id text NOT NULL,
  quantity integer DEFAULT 1,
  metadata jsonb,
  obtained_at timestamptz DEFAULT now()
);
```

## 🔮 Future Enhancements

- [ ] Supabase sync for persistence
- [ ] Lootbox opening animation screen (slot machine style)
- [ ] Inventory panel in game HUD
- [ ] Character skin sprite rendering
- [ ] Daily reward lootbox
- [ ] Achievement-based lootboxes
- [ ] Duplicate compensation (coins for duplicate skins)
