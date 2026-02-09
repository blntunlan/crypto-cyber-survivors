import { DifficultyManager } from '../services/gameplay/DifficultyManager';
import { TimeService } from '../services/core/TimeService';
import { DIFFICULTY_CONFIG } from '../services/difficulty/constants';
import { ALL_CARDS_FLAT, TOTAL_CARDS } from '../services/cards/cardDefinitions';
import { type Card } from '../services/cards/types';

// Constants
const GAME_DURATION_SEC = 300; // 5 Minutes
const BASE_PLAYER_HP = 100;
const BASE_PLAYER_DMG = 10;
const BASE_FIRE_RATE = 1.0; // Attacks per second
const LEVERAGES = [1, 5, 25, 100];

// Simulation State
interface PlayerState {
  level: number;
  xp: number;
  xpToNextLevel: number;
  stats: {
    damage: number;
    hp: number;
    maxHp: number;
    fireRate: number; // shots/sec
    critChance: number;
    armor: number; // Flat reduction
    lifesteal: number;
  };
  buildName: string; // Dynamic description of top stats
  cards: string[]; // IDs of picked cards
}

// XP Formula used in game
function getXpReq(level: number, leverageMod: number = 1.0): number {
  return Math.floor(100 * Math.pow(level, 1.2) * leverageMod);
}

// Helper: Apply Card to Stats
function applyCard(player: PlayerState, card: Card) {
  player.cards.push(card.name);

  if (!card.modifiers) return;

  card.modifiers.forEach(mod => {
    const value = mod.value;
    switch (mod.stat) {
      case 'baseDamage':
        if (mod.type === 'add') player.stats.damage += value;
        if (mod.type === 'percent') player.stats.damage *= 1 + value;
        break;
      case 'maxHp':
        if (mod.type === 'add') player.stats.maxHp += value;
        if (mod.type === 'percent') player.stats.maxHp *= 1 + value;
        // Heal on max hp inc
        player.stats.hp = player.stats.maxHp;
        break;
      case 'fireRate':
        // In game code, lower fireRate value = faster (delay).
        // But here we track shots/sec. So inverse logic.
        // "value: -0.15" means 15% faster delay -> 1/0.85 = ~1.17x shots/sec
        // Assuming standardized: Positive 'percent' on FireRate = Faster attacks in this sim.
        if (mod.type === 'percent') player.stats.fireRate *= 1 + Math.abs(value);
        if (mod.type === 'multiply') player.stats.fireRate *= value;
        break;
      case 'armor':
        if (mod.type === 'add') player.stats.armor += value;
        break;
      case 'critChance':
        if (mod.type === 'add') player.stats.critChance += value;
        break;
      case 'lifesteal':
        if (mod.type === 'add') player.stats.lifesteal += value;
        break;
    }
  });
}

// Helper: Pick Random Card
function pickRandomCard(): Card {
  const idx = Math.floor(Math.random() * TOTAL_CARDS);
  return ALL_CARDS_FLAT[idx] ?? ALL_CARDS_FLAT[0]; // Fallback
}

async function runFullGameSimulation(leverage: number) {
  console.log(`\n=== 🎮 FULL GAME SIMULATION [Leverage: ${leverage}x] ===`);
  console.log('Simulating Mechanics: Kills -> Gems -> XP -> Level -> Cards -> Power');
  console.log('Scaling: Base Spawn = 4.0/sec. Base XP = 10 * LevMod.');

  // Init Player
  const player: PlayerState = {
    level: 1,
    xp: 0,
    xpToNextLevel: getXpReq(1, leverage > 1 ? 1.5 : 1.0),
    stats: {
      damage: BASE_PLAYER_DMG,
      hp: BASE_PLAYER_HP,
      maxHp: BASE_PLAYER_HP,
      fireRate: BASE_FIRE_RATE,
      critChance: 0.05,
      armor: 0,
      lifesteal: 0,
    },
    buildName: 'Starter',
    cards: [],
  };

  console.log(
    'Time   | Phase       | Lvl | Spawn | HP    | Kills | GenXP | Cards | P.DPS | P.HP  | Status'
  );
  console.log(
    '-------|-------------|-----|-------|-------|-------|-------|-------|-------|-------|-------'
  );

  let totalKills = 0;
  let accumulatedKills = 0; // For handling fractional kills

  // Simulate second by second
  for (let sec = 0; sec <= GAME_DURATION_SEC; sec++) {
    // 1. Difficulty Calculation
    DifficultyManager.reset();
    TimeService.reset();
    TimeService.setGameTime(sec * 1000);
    DifficultyManager.startGame(leverage);

    // Linear PnL Gain simulation (+200% at end for a good run)
    const pnl = (sec / GAME_DURATION_SEC) * 2.0;

    const difficulty = DifficultyManager.calculate(pnl, 0.015, player.level, 1.0);

    // 2. Combat Resolution (Per Second)
    // Player DPS
    const dps =
      player.stats.damage * player.stats.fireRate * (1 + player.stats.critChance * 0.5);

    // Enemy "Bulk"
    // Assume Base Spawn Density = 4.0 enemies / sec at 1.0 difficulty
    const baseSpawnDensity = 4.0;
    const enemiesPerSec = baseSpawnDensity * difficulty.spawnRate;

    const singleEnemyHp = 20 * difficulty.enemyHealth; // Base 20 HP
    const totalEnemyHpPool = singleEnemyHp * enemiesPerSec;

    // Kill Rate
    const clearRatio = Math.min(2.0, dps / totalEnemyHpPool);

    // Calculate theoretical kills this second
    const killsThisSecRaw = enemiesPerSec * Math.min(1.0, clearRatio);
    accumulatedKills += killsThisSecRaw;

    const actualKills = Math.floor(accumulatedKills);
    accumulatedKills -= actualKills;
    totalKills += actualKills;

    // 3. Loot & XP Logic
    // Base XP per gem = 10 * leverageMod
    const gemsCollected = actualKills * 0.8; // 80% drop rate
    const levMod = Math.log10(leverage + 9); // 1->1, 100->~2
    const xpGain = gemsCollected * (10 * levMod);

    player.xp += xpGain;

    // 4. Level Up Logic
    let safety = 0;
    while (player.xp >= player.xpToNextLevel && safety < 50) {
      safety++;
      player.xp -= player.xpToNextLevel;
      player.level++;
      player.xpToNextLevel = getXpReq(player.level, leverage > 1 ? 1.5 : 1.0);

      const card = pickRandomCard();
      applyCard(player, card);
    }

    // 5. Survival Logic
    let hpStatus = 'OK';
    // Enemies getting through?
    if (clearRatio < 0.95) {
      const missedEnemies = (1.0 - clearRatio) * enemiesPerSec;
      // Base 10 Damage
      const enemyDmg = 10 * difficulty.enemyDamage;

      // Assume player dodges 30% of incoming hits naturally
      // And takes 1 hit per overflow enemy
      const hitsTaken = missedEnemies * 0.7;

      const incomingDmg = Math.max(0, hitsTaken * enemyDmg - player.stats.armor);

      // Lifesteal Cap: Can't heal more than we dealt dmg
      const maxHeal = Math.min(dps, totalEnemyHpPool) * player.stats.lifesteal;
      player.stats.hp += maxHeal;

      player.stats.hp -= incomingDmg * 0.5; // Mitigation constant (kiting/iframes)

      if (player.stats.hp > player.stats.maxHp) player.stats.hp = player.stats.maxHp;

      if (player.stats.hp < player.stats.maxHp * 0.4) hpStatus = '⚠️';
      if (player.stats.hp <= 0) {
        hpStatus = '💀 DIED';
        player.stats.hp = 0;
      }
    } else {
      // Regen if clear is good
      const regen = player.stats.maxHp * 0.01;
      player.stats.hp += regen;
      if (player.stats.hp > player.stats.maxHp) player.stats.hp = player.stats.maxHp;
    }

    // 6. Logging
    if (sec % 30 === 0 || hpStatus.includes('DIED')) {
      const phase = 'active';
      console.log(
        `${(sec / 60).toFixed(1)}m`.padEnd(7) +
          '| ' +
          phase.padEnd(12) +
          '| ' +
          player.level.toString().padEnd(4) +
          '| ' +
          difficulty.spawnRate.toFixed(1).padEnd(6) +
          '| ' +
          difficulty.enemyHealth.toFixed(1).padEnd(6) +
          '| ' +
          totalKills.toString().padEnd(6) +
          '| ' +
          xpGain.toFixed(0).padEnd(6) +
          '| ' +
          player.cards.length.toString().padEnd(6) +
          '| ' +
          dps.toFixed(0).padEnd(6) +
          '| ' +
          player.stats.hp.toFixed(0).padEnd(6) +
          '| ' +
          hpStatus
      );

      if (hpStatus.includes('DIED')) break;
    }
  }
}

// Execute for all leverages
(async () => {
  for (const lev of LEVERAGES) {
    await runFullGameSimulation(lev);
  }
})().catch(console.error);
