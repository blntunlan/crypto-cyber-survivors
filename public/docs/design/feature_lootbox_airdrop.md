# Feature Specification: Mystery Airdrop (Lootbox System)

## 1. Overview
The **Mystery Airdrop** is a high-value, RNG-based loot mechanic designed to inject excitement and "dopamine spikes" into the gameplay loop. Keeping with the *Crypto Cyber Survivors* theme, these appear as "Airdrops" or "Encrypted Ledgers" that the player must secure.

## 2. Thematic Integration
*   **Name:** Mystery Airdrop / Glitched Ledger
*   **Visual Style:** A floating, rotating holographic crate with a "Question Mark" or "Bitcoin" symbol. It should have a glitch effect to fit the Cyberpunk aesthetic.
*   **Sound:** A distinctive "digital chime" when it spawns (audio cue) and a specific "unlock/mining" sound when collected.

## 3. Mechanics

### 3.1 Spawning Logic
*   **Trigger:** Spawns are determined by `SpawnSystem` based on `GameTime` or `KillCount`.
*   **Frequency:** Rare. Roughly 1 every 2-3 minutes or every 500 kills.
*   **Despawn:** Unlike gems, Airdrops arguably shouldn't despawn, or should have a long lifetime (30s) with a blinking warning before disappearing.

### 3.2 Collection Interaction
*   **Pickup:** Player walks over the Airdrop to collect.
*   **Feedback:**
    *   **Visual:** A mini "Slot Reel" animation plays above the player's head or a quick flash.
    *   **Audio:** Slot machine spin sound -> Win sound.
    *   **Text:** Floating text announces the reward (e.g., "JACKPOT! +500 XP").

### 3.3 Loot Table (Rewards)
The reward is determined by a weighted RNG system (The "Smart Contract").

| Tier | Probability | Name | Effect |
| :--- | :--- | :--- | :--- |
| **Common** | 40% | **Gas Refund** | A burst of **XP Gems** (equivalent to ~50 normal kills). |
| **Uncommon** | 30% | **Liquidity Injection** | Restores **25% Max HP**. |
| **Rare** | 20% | **Bull Run Mode** | **Buff:** +50% Fire Rate & Movement Speed for 10 seconds. |
| **Epic** | 9% | **Hard Fork** | Clears all enemies on screen (Smart Bomb effect). |
| **Legendary** | 1% | **Whale Wallet** | Grants a **Free Upgrade** (Directly opens selection screen or gives random +1 level to an item). |

### 3.4 The "Rug Pull" (Optional / High Difficulty)
*   *Idea:* In higher difficulty waves (Volatility > 50%), there is a 5% chance the Airdrop is a "Rug Pull".
*   *Effect:* Instead of Loot, it spawns a trapped **Liquidator Elite** enemy or releases a small explosion (Player takes damage).
*   *Purpose:* Adds risk/reward tension.

## 4. Technical Implementation Plan

### 4.1 New Entity: `LootBox`
*   Extend `IGameEntity` or similar interface.
*   Properties: `x`, `y`, `type`, `lifetime`.

### 4.2 Updates to Systems
*   **`SpawnSystem`**: Add logic to spawn `LootBox` occasionally.
*   **`CollectionSystem`**: Handle collision between Player and `LootBox`. Trigger the reward logic.
*   **`LootService` (New)**: Centralize the RNG logic and reward execution.

### 4.3 Assets Needed
*   **Sprite:** Airdrop Box (Closed), Airdrop Box (Open/Empty).
*   **SFX:** Spawn Alert, Open Sound, Rug Pull (Error) Sound.
*   **VFX:** Glitch particles on spawn, Confetti/Gold particles on open.

## 5. UI / UX
*   **Minimap (if applicable):** Show a special icon for Airdrops.
*   **Screen Edge Indicator:** If off-screen, show an arrow pointing to the Airdrop (like "Quest Objective").

## 6. Future Expansion
*   **Key System:** Player needs to collect "Private Keys" dropped by Elites to open high-tier Airdrops.
*   **Community Airdrops:** Twitch integration where chat can spawn airdrops.
