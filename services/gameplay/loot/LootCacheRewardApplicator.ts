import { type GameState, type Gem, type Player } from '../../../types';
import { type LootCacheRewardId } from '../../../types/lootCache';
import { COLORS } from '../../../config/Colors';
import { ECONOMY_CONFIG } from '../../../config/GameConfig';
import { LOOT_CACHE_CONFIG } from '../../../config/LootCacheConfig';
import { type IPoolManager } from '../../interfaces/IPoolManager';
import { EventBus } from '../../core/EventBus';
import { BuffManager } from '../../patterns/decorators/BuffManager';
import { OverclockContractDecorator } from '../../patterns/decorators/buffs';
import { type LootCacheRandomSource } from './LootCacheRewardResolver';
import { GAME_ENGINE } from '../../../constants';

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const DATA_GEM_MIN_DISTANCE_PX = 12;
const DATA_GEM_DISTANCE_RANGE_PX = 24;
const REWARD_TEXT_SIZE_PX = 24;
const HEAL_TEXT_OFFSET_Y_PX = 20;

export type LootCacheRewardApplicationContext = {
  pool: IPoolManager;
  player: Player;
  state: GameState;
  x: number;
  y: number;
  random: LootCacheRandomSource;
};

export class LootCacheRewardApplicator {
  static apply(
    reward: LootCacheRewardId,
    strength: number,
    context: LootCacheRewardApplicationContext
  ): void {
    switch (reward) {
      case 'liquidity_injection':
        LootCacheRewardApplicator.applyLiquidity(strength, context);
        return;
      case 'data_dividend':
        LootCacheRewardApplicator.applyDataDividend(strength, context);
        return;
      case 'overclock_contract':
        LootCacheRewardApplicator.applyOverclock(context);
        return;
      case 'circuit_breaker':
        LootCacheRewardApplicator.applyCircuitBreaker(strength, context);
        return;
      default: {
        const exhaustiveReward: never = reward;
        return exhaustiveReward;
      }
    }
  }

  private static applyLiquidity(
    strength: number,
    context: LootCacheRewardApplicationContext
  ): void {
    const { player } = context;
    const previousHp = player.hp;
    const healAmount =
      player.maxHp * LOOT_CACHE_CONFIG.rewards.healMaxHpFraction * strength;
    player.hp = Math.min(player.maxHp, player.hp + healAmount);
    player.invulnerabilityTimer = Math.max(
      player.invulnerabilityTimer,
      LOOT_CACHE_CONFIG.rewards.contactProtectionMs
    );

    const actualHeal = player.hp - previousHp;
    EventBus.emit('playerHealed', {
      amount: actualHeal,
      x: player.x,
      y: player.y - HEAL_TEXT_OFFSET_Y_PX,
      source: 'pickup',
    });
    EventBus.emit('playerHealthChange', {
      hpPercent: (player.hp / player.maxHp) * 100,
      hp: player.hp,
      maxHp: player.maxHp,
    });

    LootCacheRewardApplicator.spawnFloatingText(
      context,
      `+${actualHeal} HP`,
      COLORS.NEON_GREEN
    );
  }

  private static applyDataDividend(
    strength: number,
    context: LootCacheRewardApplicationContext
  ): void {
    const gemCount = LOOT_CACHE_CONFIG.rewards.xpGemCount;
    const nextLevelExpBasis =
      Number.isFinite(context.player.nextLevelExp) && context.player.nextLevelExp > 0
        ? context.player.nextLevelExp
        : 1;
    const rawTotalXp =
      nextLevelExpBasis * LOOT_CACHE_CONFIG.rewards.xpNextLevelFraction * strength;
    const totalXp = Math.max(
      1,
      Number.isFinite(rawTotalXp) ? Math.floor(rawTotalXp) : 1
    );
    const baseGemValue = Math.floor(totalXp / gemCount);
    const remainder = totalXp % gemCount;
    let carriedValue = 0;
    let lastSuccessfulGem: Gem | null = null;

    for (let gemIndex = 0; gemIndex < gemCount; gemIndex++) {
      const angle = context.random.nextFloat() * FULL_CIRCLE_RADIANS;
      const distance =
        DATA_GEM_MIN_DISTANCE_PX +
        context.random.nextFloat() * DATA_GEM_DISTANCE_RANGE_PX;
      const gemValue = baseGemValue + (gemIndex < remainder ? 1 : 0) + carriedValue;

      try {
        lastSuccessfulGem = context.pool.getGem(
          context.x + Math.cos(angle) * distance,
          context.y + Math.sin(angle) * distance,
          gemValue,
          ECONOMY_CONFIG.GEMS.NORMAL_SIZE,
          COLORS.GEM,
          false
        );
        carriedValue = 0;
      } catch {
        carriedValue = gemValue;
        continue;
      }
    }

    if (carriedValue > 0 && lastSuccessfulGem !== null) {
      lastSuccessfulGem.value += carriedValue;
    } else if (carriedValue > 0) {
      context.player.exp += carriedValue;
      EventBus.emit('xpGained', { amount: carriedValue });
      EventBus.emit('playerExperienceChange', {
        exp: context.player.exp,
        nextLevelExp: context.player.nextLevelExp,
        expPercent: (context.player.exp / nextLevelExpBasis) * 100,
      });
      if (
        context.player.exp >= context.player.nextLevelExp &&
        context.state.levelUpFreeze <= 0
      ) {
        context.state.levelUpFreeze = GAME_ENGINE.PENDING_LEVEL_UP_FREEZE_MS;
        EventBus.emit('levelUpStart', {});
      }
    }

    LootCacheRewardApplicator.spawnFloatingText(
      context,
      `+${totalXp} DATA`,
      COLORS.GEM
    );
  }

  private static applyOverclock(context: LootCacheRewardApplicationContext): void {
    BuffManager.addBuff(OverclockContractDecorator);
    LootCacheRewardApplicator.spawnFloatingText(
      context,
      'OVERCLOCK',
      COLORS.ELECTRIC_BLUE
    );
  }

  private static applyCircuitBreaker(
    strength: number,
    context: LootCacheRewardApplicationContext
  ): void {
    const enemies = context.pool.activeEnemies;
    const pushDistance = LOOT_CACHE_CONFIG.rewards.circuitBreakerPushPixels * strength;

    for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex++) {
      const enemy = enemies[enemyIndex]!;
      if (!enemy.active || enemy.isDying) {
        continue;
      }

      let deltaX = enemy.x - context.x;
      let deltaY = enemy.y - context.y;
      let distance = Math.hypot(deltaX, deltaY);
      if (distance < Number.EPSILON) {
        const angle = context.random.nextFloat() * FULL_CIRCLE_RADIANS;
        deltaX = Math.cos(angle);
        deltaY = Math.sin(angle);
        distance = 1;
      }

      enemy.x += (deltaX / distance) * pushDistance;
      enemy.y += (deltaY / distance) * pushDistance;
      enemy.movementSlowTimerMs = LOOT_CACHE_CONFIG.rewards.circuitBreakerSlowMs;
      enemy.movementSlowMultiplier =
        LOOT_CACHE_CONFIG.rewards.circuitBreakerSlowMultiplier;
    }

    LootCacheRewardApplicator.spawnFloatingText(
      context,
      'CIRCUIT BREAKER',
      COLORS.JACKPOT_YELLOW
    );
  }

  private static spawnFloatingText(
    context: LootCacheRewardApplicationContext,
    text: string,
    color: string
  ): void {
    try {
      context.pool.getFloatingText(
        context.x,
        context.y,
        text,
        color,
        REWARD_TEXT_SIZE_PX
      );
    } catch {
      return;
    }
  }
}
