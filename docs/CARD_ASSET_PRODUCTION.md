# Card Asset Production Plan & Registry

This document serves as the master registry for all card iconography. It maps the game's tier system and card list to specific visual prompts, ensuring a unified visual language that mimics the impact of a high-end casino slot machine.

## 🎨 Art Direction: "Slot Machine Cyberpunk"

*   **Core Aesthetic:** Ultra-Detailed, Neon, Glass/Crystal, Dark Background.
*   **Context:** Icons are displayed on dark "slot machine" style cards with additive blending.
*   **Requirement:** **NO TEXT**. Pure visual symbols.
*   **Format:** High-contrast PNGs/SVGs suitable for `mix-blend-mode: plus-lighter` overlay.

## 🏆 Tier Visual Hierarchy

We use a strict 4-tier visual system. Each tier has a distinct visual rule set and color palette.

| Tier | Name | Color Code (Hex) | Visual Style Rule |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Common** | `#9ca3af` (Silver/Gray) | **Line Art / Minimalist.** Thin, laser-like neon lines. Abstract shapes. Mostly black space. |
| **Tier 2** | **Rare** | `#00BFFF` (Electric Blue) | **Outline / Geometric.** Clear silhouettes formed by thicker lines and tech nodes. PCB/Circuit style. |
| **Tier 3** | **Epic** | `#7558A4` (Royal Purple) | **Volume / Hollow.** 3D wireframe shapes with internal glow. More complex, partial energetic fills. |
| **Tier 4** | **Legendary** | `#D6B85C` (Casino Gold) | **Solid / Crystalline.** Fully filled, solid jewel-like heavy objects. Maximum brightness. Dominant presence. |

---

## 🃏 Card Asset Registry

This table lists every card in the game, its assigned tier, and the specific visual prompt key to be used for generation.

### Tier 1: Common (Gray/Silver)
*Style: Minimal, sharp, abstract line art.*

| Card ID | Name | Symbol Concept | Prompt Key | Status |
| :--- | :--- | :--- | :--- | :--- |
| `dmg_c1` | Market Order | Simple upward chart arrow | `icon_market_order_t1` | ❌ Pending |
| `spd_c1` | Quick Trade | Simple lightning bolt outline | `icon_bolt_t1` | ✅ Done |
| `hp_c1` | Safety Net | Simple shield outline | `icon_shield_t1` | ✅ Done |
| `magnet_c1` | Yield Farm | Simple U-magnet shape | `icon_magnet_t1` | ✅ Done |
| `armor_c1` | Stop Loss | Broken shield or wall line | `icon_stop_loss_t1` | ✅ Done |
| `crit_c1` | Sniper Bot | Crosshair reticle (simple) | `icon_sniper_bot_t1` | ✅ Done |
| `lifesteal_c1` | DCA Mode | Recycling arrows loop | `icon_dca_mode_t1` | ❌ Pending (Quota) |
| `balance_c1` | Rebalance | Scales (simple lines) | `icon_rebalance_t1` | ✅ Done |

### Tier 2: Rare (Electric Blue)
*Style: Geometric, circuit-board outlines, tech nodes.*

| Card ID | Name | Symbol Concept | Prompt Key | Status |
| :--- | :--- | :--- | :--- | :--- |
| `speed_r1` | Bull Run | Geometric Bull Head Outline | `icon_bull_run_t2` | ✅ Done |
| `dmg_r1` | Limit Order | Target lock with borders | `icon_limit_order_t2` | ❌ Pending |
| `spd_r1` | High Frequency | Multiple fast wave lines | `icon_high_freq_t2` | ❌ Pending |
| `crit_r1` | Insider Info | Eye shape with data nodes | `icon_insider_info_t2` | ❌ Pending |
| `luck_r1` | Alpha Leak | Keyhole or open door circuit | `icon_alpha_leak_t2` | ❌ Pending |
| `area_r1` | Market Cap | Expanding circle/sphere grid | `icon_market_cap_t2` | ❌ Pending |
| `proj_r1` | Double Down | Two overlapping ammo shells | `icon_double_down_t2` | ❌ Pending |
| `shield_r1` | HODL Shield | Reinforced Shield (Hexagon) | `icon_hodl_shield_t2` | ❌ Pending |
| `exec_r1` | Short Squeeze | Vice grip or squeezing hand | `icon_short_squeeze_t2` | ❌ Pending |

### Tier 3: Epic (Royal Purple)
*Style: Volumetric wireframes, internal glow, magical tech.*

| Card ID | Name | Symbol Concept | Prompt Key | Status |
| :--- | :--- | :--- | :--- | :--- |
| `dmg_e1` | Leverage Trade | 100x multiplier symbol (3D) | `icon_leverage_trade_t3` | ❌ Pending |
| `vamp_e1` | Staking Rewards | Dripping coin or liquid drop | `icon_staking_rewards_t3` | ❌ Pending |
| `speed_e1` | Flash Loan | Speeding comet/flash orb | `icon_flash_loan_t3` | ❌ Pending |
| `tank_e1` | Cold Wallet | Heavy vault door / Safe | `icon_cold_wallet_t3` | ❌ Pending |
| `explode_e1` | Liquidation | Explosion / Shattered coin | `icon_liquidation_t3` | ❌ Pending |
| `chain_e1` | Lightning Network | Chain links with electricity | `icon_lightning_net_t3` | ❌ Pending |
| `regen_e1` | Smart Contract | Scroll/Contract with sigil | `icon_smart_contract_t3` | ❌ Pending |
| `random_e1` | Degenerate | Neon Dice (Detailed) | `icon_degenerate_t3` | ❌ Pending |
| `banano_e1` | Banano Split | Neon 3D Banana Split/Peel | `icon_banano_split_t3` | ❌ Pending |

### Tier 4: Legendary (Casino Gold)
*Style: Solid, Jeweled, Heavy, Maximum Importance.*

| Card ID | Name | Symbol Concept | Prompt Key | Status |
| :--- | :--- | :--- | :--- | :--- |
| `moon_l1` | To The Moon | Solid Crystal Rocket | `icon_to_the_moon_t4` | ✅ Done (Bull Tier 3 used temporarily) |
| `diamond_l1` | Diamond Hands | Solid Diamond Gem | `icon_diamond_hands_t4` | ❌ Pending |
| `whale_l1` | Whale Alert | Solid Gold Whale Signal | `icon_whale_alert_t4` | ❌ Pending |
| `ape_l1` | Full Ape Mode | Solid Gold Gorilla Head | `icon_ape_mode_t4` | ❌ Pending |
| `satoshi_l1` | Satoshi Mode | Genesis Block / Crown | `icon_satoshi_mode_t4` | ❌ Pending |
| `rug_l1` | Rug Pull | Skull (Gold/Jeweled) | `icon_rug_pull_t4` | ❌ Pending |
| `nft_l1` | NFT Collection | Framed Digital Art/Gem | `icon_nft_collection_t4` | ❌ Pending |
| `timelock_l1` | Time Lock | Golden Hourglass/Clock | `icon_time_lock_t4` | ❌ Pending |
| `gas_l1` | Gas Fee Burn | Burning Flame (Solid Gold) | `icon_gas_burn_t4` | ❌ Pending |

---

## 🤖 Icon Generation Prompts (Reference)

### TIER 4 (Legendary - Gold) Prompt
> **Objective:** Create a Tier 4 "Legendary" icon for [CARD_NAME].
> **Subject:** [CONCEPT]
> **Style:** A single, massive, solid **GOLD (#D6B85C)** object on a black background. It should look like a high-value physical casino chip or jewelry.
> **Details:** No outlines, fully filled volume. Crystalline or metallic texture. Intense internal refraction. Sharp edges.
> **Constraint:** NO TEXT. Solid Black Background.

### TIER 3 (Epic - Purple) Prompt
> **Objective:** Create a Tier 3 "Epic" icon for [CARD_NAME].
> **Subject:** [CONCEPT]
> **Style:** A volumetric **PURPLE (#7558A4)** neon wireframe object on a black background.
> **Details:** It looks 3D but is made of glowing energy lines. It has internal haze/glow but is not a solid block. Cyber-magical aesthetic.
> **Constraint:** NO TEXT. Solid Black Background.

### TIER 2 (Rare - Blue) Prompt
> **Objective:** Create a Tier 2 "Rare" icon for [CARD_NAME].
> **Subject:** [CONCEPT]
> **Style:** A precise, flat **ELECTRIC BLUE (#00BFFF)** geometric outline on a black background.
> **Details:** Circuit board traces, connection nodes (dots) at corners. Looks like a schematic or blueprint. Mid-weight lines.
> **Constraint:** NO TEXT. Solid Black Background.

### TIER 1 (Common - Gray/Silver) Prompt
> **Objective:** Create a Tier 1 "Common" icon for [CARD_NAME].
> **Subject:** [CONCEPT]
> **Style:** Minimalist **SILVER/GRAY (#9ca3af)** line art on a black background.
> **Details:** Very thin lines. Abstract representation. Fast, sleek, low-detail. Laser-cut look.
> **Constraint:** NO TEXT. Solid Black Background.

---

## 🔄 Workflow Continuity & Quota Management

To ensure uninterrupted production despite AI generation limits, follow this workflow:

1.  **Check Status:** Always review the tables above. Items marked `❌ Pending` are next in queue.
2.  **Batch Processing:** Attempt to generate batches of 3-5 images at a time to maximize context window efficiency.
3.  **Quota Hit Protocol:**
    *   If the image generation tool hits a rate limit (`429 Too Many Requests`):
    *   **STOP** generating images immediately for that session.
    *   Mark the failed item as `❌ Pending (Quota)` in this document.
    *   Switch focus to **Code Integration** (updating `CardSystem.ts` with the images already generated) or **Game Logic** tasks.
    *   Resume generation in the next session (typically after 4 hours).
4.  **Integration Step:** After generating a batch:
    *   Move images to `public/assets/icons/cards/`.
    *   Update `CardSystem.ts` to point to the new paths.
    *   Update this document's tables to `✅ Done`.

### Next Sprints
1.  **Finish Tier 1:** Generate `icon_dca_mode_t1`.
2.  **Start Tier 2:** Begin with `icon_limit_order_t2` and `icon_high_freq_t2`.
3.  **Start Tier 4:** Generate `icon_diamond_hands_t4` (High Priority visual).
