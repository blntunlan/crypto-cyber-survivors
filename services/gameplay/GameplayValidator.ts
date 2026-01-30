/**
 * GameplayValidator - Gameplay Logic Error Detection & Auto-Fix Service
 *
 * Monitors gameplay elements for logic inconsistencies and can auto-correct them.
 * Follows singleton pattern and communicates via EventBus.
 *
 * Validation Categories:
 * - Player state (HP, stats, level)
 * - Market data consistency
 * - Entity state (enemies, bullets, gems)
 * - UI state synchronization
 * - Game state transitions
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import {
  type Player,
  type MarketData,
  type Enemy,
  type Gem,
  GameStatus,
  MarketPosition,
} from '../../types';
import {
  type ValidationIssue,
  type ValidationCategory,
  type ValidationSeverity,
} from '../../types/events';

// =============================================================================
// TYPES
// =============================================================================

// Re-export event types for convenience
export type {
  ValidationIssue,
  ValidationCategory,
  ValidationSeverity,
} from '../../types/events';

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  fixedCount: number;
}

export interface ValidationConfig {
  autoFix: boolean;
  logIssues: boolean;
  emitEvents: boolean;
  maxIssuesPerFrame: number;
}

export interface GameplaySnapshot {
  player?: Player;
  marketData?: MarketData;
  enemies?: Enemy[];
  gems?: Gem[];
  gameStatus?: GameStatus;
  timestamp: number;
}

// Validation rule type
type ValidationRule<T> = {
  id: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  check: (data: T, snapshot: GameplaySnapshot) => boolean;
  message: string | ((data: T) => string);
  fix?: (data: T) => T;
};

// =============================================================================
// VALIDATION RULES
// =============================================================================

const PLAYER_RULES: ValidationRule<Player>[] = [
  {
    id: 'player.hp.negative',
    category: 'player',
    severity: 'critical',
    check: p => p.hp >= 0,
    message: p => `Player HP is negative: ${p.hp}`,
    fix: p => ({ ...p, hp: 0 }),
  },
  {
    id: 'player.hp.exceeds_max',
    category: 'player',
    severity: 'error',
    check: p => p.hp <= p.maxHp,
    message: p => `Player HP (${p.hp}) exceeds maxHp (${p.maxHp})`,
    fix: p => ({ ...p, hp: p.maxHp }),
  },
  {
    id: 'player.maxHp.invalid',
    category: 'player',
    severity: 'critical',
    check: p => p.maxHp > 0,
    message: 'Player maxHp must be positive',
    fix: p => ({ ...p, maxHp: 100 }),
  },
  {
    id: 'player.level.invalid',
    category: 'player',
    severity: 'error',
    check: p => p.level >= 1,
    message: p => `Player level (${p.level}) must be >= 1`,
    fix: p => ({ ...p, level: 1 }),
  },
  {
    id: 'player.exp.negative',
    category: 'player',
    severity: 'warning',
    check: p => p.exp >= 0,
    message: p => `Player exp is negative: ${p.exp}`,
    fix: p => ({ ...p, exp: 0 }),
  },
  {
    id: 'player.nextLevelExp.invalid',
    category: 'player',
    severity: 'error',
    check: p => p.nextLevelExp > 0,
    message: 'nextLevelExp must be positive',
    fix: p => ({ ...p, nextLevelExp: 100 }),
  },
  {
    id: 'player.stats.baseDamage',
    category: 'player',
    severity: 'warning',
    check: p => p.baseDamage > 0,
    message: p => `Player baseDamage (${p.baseDamage}) must be positive`,
    fix: p => ({ ...p, baseDamage: 10 }),
  },
  {
    id: 'player.stats.speed',
    category: 'player',
    severity: 'warning',
    check: p => p.speed > 0 && p.speed < 1000,
    message: p => `Player speed (${p.speed}) out of valid range`,
    fix: p => ({ ...p, speed: Math.max(1, Math.min(p.speed, 999)) }),
  },
  {
    id: 'player.stats.fireRate',
    category: 'player',
    severity: 'warning',
    check: p => p.fireRate > 0,
    message: p => `Player fireRate (${p.fireRate}) must be positive`,
    fix: p => ({ ...p, fireRate: Math.max(0.1, p.fireRate) }),
  },
  {
    id: 'player.stats.critChance',
    category: 'player',
    severity: 'warning',
    check: p => p.critChance >= 0 && p.critChance <= 1,
    message: p => `Player critChance (${p.critChance}) must be 0-1`,
    fix: p => ({ ...p, critChance: Math.max(0, Math.min(1, p.critChance)) }),
  },
  {
    id: 'player.stats.lifesteal',
    category: 'player',
    severity: 'warning',
    check: p => p.lifesteal >= 0 && p.lifesteal <= 1,
    message: p => `Player lifesteal (${p.lifesteal}) must be 0-1`,
    fix: p => ({ ...p, lifesteal: Math.max(0, Math.min(1, p.lifesteal)) }),
  },
  {
    id: 'player.position.nan',
    category: 'player',
    severity: 'critical',
    check: p => !isNaN(p.x) && !isNaN(p.y),
    message: 'Player position contains NaN',
    fix: p => ({
      ...p,
      x: isNaN(p.x) ? 400 : p.x,
      y: isNaN(p.y) ? 300 : p.y,
    }),
  },
  {
    id: 'player.invulnerability.negative',
    category: 'player',
    severity: 'warning',
    check: p => p.invulnerabilityTimer >= 0,
    message: 'Invulnerability timer is negative',
    fix: p => ({ ...p, invulnerabilityTimer: 0 }),
  },
];

const MARKET_RULES: ValidationRule<MarketData>[] = [
  {
    id: 'market.price.invalid',
    category: 'market',
    severity: 'error',
    check: m => m.price > 0 && isFinite(m.price),
    message: m => `Market price invalid: ${m.price}`,
  },
  {
    id: 'market.difficulty.range',
    category: 'market',
    severity: 'warning',
    check: m => m.difficulty >= 0 && m.difficulty <= 10,
    message: m => `Market difficulty (${m.difficulty}) out of expected range 0-10`,
  },
  {
    id: 'market.rsi.range',
    category: 'market',
    severity: 'warning',
    check: m => m.rsi >= 0 && m.rsi <= 100,
    message: m => `RSI (${m.rsi}) must be 0-100`,
  },
  {
    id: 'market.leverage.valid',
    category: 'market',
    severity: 'error',
    check: m => [1, 2, 5, 10, 25, 50, 100].includes(m.leverage),
    message: m => `Invalid leverage: ${m.leverage}`,
  },
  {
    id: 'market.pnl.nan',
    category: 'market',
    severity: 'error',
    check: m => !isNaN(m.pnl) && !isNaN(m.effectivePnl),
    message: 'PnL contains NaN values',
  },
  {
    id: 'market.position.valid',
    category: 'market',
    severity: 'warning',
    check: m =>
      !m.position || [MarketPosition.LONG, MarketPosition.SHORT].includes(m.position),
    message: m => `Invalid market position: ${m.position}`,
  },
  {
    id: 'market.liquidationPrice.logical',
    category: 'market',
    severity: 'warning',
    check: m => {
      if (!m.liquidationPrice || !m.position) return true;
      if (m.position === MarketPosition.LONG) {
        return m.liquidationPrice < m.price;
      }
      return m.liquidationPrice > m.price;
    },
    message: 'Liquidation price is illogical for current position',
  },
];

const ENEMY_RULES: ValidationRule<Enemy>[] = [
  {
    id: 'enemy.health.negative',
    category: 'enemy',
    severity: 'error',
    check: e => !e.active || e.health >= 0,
    message: e => `Enemy health negative: ${e.health}`,
    fix: e => ({ ...e, health: 0 }),
  },
  {
    id: 'enemy.health.exceeds_max',
    category: 'enemy',
    severity: 'warning',
    check: e => !e.active || e.health <= e.maxHealth,
    message: e => `Enemy health (${e.health}) exceeds maxHealth (${e.maxHealth})`,
    fix: e => ({ ...e, health: e.maxHealth }),
  },
  {
    id: 'enemy.maxHealth.invalid',
    category: 'enemy',
    severity: 'error',
    check: e => !e.active || e.maxHealth > 0,
    message: 'Enemy maxHealth must be positive',
    fix: e => ({ ...e, maxHealth: 10, health: Math.min(e.health, 10) }),
  },
  {
    id: 'enemy.position.nan',
    category: 'enemy',
    severity: 'critical',
    check: e => !e.active || (!isNaN(e.x) && !isNaN(e.y)),
    message: 'Enemy position contains NaN',
    fix: e => ({ ...e, active: false }), // Deactivate broken enemy
  },
  {
    id: 'enemy.speed.invalid',
    category: 'enemy',
    severity: 'warning',
    check: e => !e.active || (e.speed >= 0 && e.speed < 1000),
    message: e => `Enemy speed (${e.speed}) invalid`,
    fix: e => ({ ...e, speed: Math.max(0, Math.min(e.speed, 500)) }),
  },
  {
    id: 'enemy.damage.negative',
    category: 'enemy',
    severity: 'error',
    check: e => !e.active || e.damage >= 0,
    message: e => `Enemy damage is negative: ${e.damage}`,
    fix: e => ({ ...e, damage: Math.max(0, e.damage) }),
  },
  {
    id: 'enemy.dying.progress',
    category: 'enemy',
    severity: 'warning',
    check: e =>
      !e.isDying ||
      (e.deathProgress !== undefined && e.deathProgress >= 0 && e.deathProgress <= 1),
    message: 'Dying enemy has invalid death progress',
    fix: e => ({
      ...e,
      deathProgress:
        e.deathProgress === undefined ? 0 : Math.max(0, Math.min(1, e.deathProgress)),
    }),
  },
];

const GEM_RULES: ValidationRule<Gem>[] = [
  {
    id: 'gem.value.invalid',
    category: 'gem',
    severity: 'warning',
    check: g => !g.active || g.value > 0,
    message: g => `Gem value (${g.value}) must be positive`,
    fix: g => ({ ...g, value: Math.max(1, g.value) }),
  },
  {
    id: 'gem.position.nan',
    category: 'gem',
    severity: 'error',
    check: g => !g.active || (!isNaN(g.x) && !isNaN(g.y)),
    message: 'Gem position contains NaN',
    fix: g => ({ ...g, active: false }),
  },
  {
    id: 'gem.lifetime.overflow',
    category: 'gem',
    severity: 'warning',
    check: g => !g.active || !g.elapsedLifetime || g.elapsedLifetime < 60000,
    message: 'Gem lifetime exceeded 60 seconds (stuck gem)',
    fix: g => ({ ...g, active: false }),
  },
];

// =============================================================================
// GAMEPLAY VALIDATOR SERVICE
// =============================================================================

class GameplayValidatorClass {
  private static instance: GameplayValidatorClass | null = null;

  private config: ValidationConfig = {
    autoFix: true,
    logIssues: true,
    emitEvents: true,
    maxIssuesPerFrame: 50,
  };

  private issueHistory: ValidationIssue[] = [];
  private maxHistorySize = 100;
  private lastValidationTime = 0;
  private validationThrottleMs = 100; // Throttle to 10 validations/sec max
  private issueCounter = 0;

  private constructor() {
    Logger.info('[GameplayValidator] Initialized');
  }

  static getInstance(): GameplayValidatorClass {
    return (GameplayValidatorClass.instance ??= new GameplayValidatorClass());
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  configure(config: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...config };
    Logger.info('[GameplayValidator] Config updated', this.config);
  }

  getConfig(): Readonly<ValidationConfig> {
    return { ...this.config };
  }

  // ============================================================================
  // MAIN VALIDATION ENTRY
  // ============================================================================

  /**
   * Validate entire gameplay snapshot
   * Call this periodically (not every frame) to check for issues
   */
  validate(snapshot: GameplaySnapshot): ValidationResult {
    const now = performance.now();
    if (now - this.lastValidationTime < this.validationThrottleMs) {
      return { isValid: true, issues: [], fixedCount: 0 };
    }
    this.lastValidationTime = now;

    const issues: ValidationIssue[] = [];
    let fixedCount = 0;

    // Validate player
    if (snapshot.player) {
      const playerResult = this.validatePlayer(snapshot.player, snapshot);
      issues.push(...playerResult.issues);
      fixedCount += playerResult.fixedCount;
    }

    // Validate market data
    if (snapshot.marketData) {
      const marketResult = this.validateMarketData(snapshot.marketData, snapshot);
      issues.push(...marketResult.issues);
      fixedCount += marketResult.fixedCount;
    }

    // Validate enemies (sample if too many)
    if (snapshot.enemies) {
      const enemyResult = this.validateEnemies(snapshot.enemies, snapshot);
      issues.push(...enemyResult.issues);
      fixedCount += enemyResult.fixedCount;
    }

    // Validate gems (sample if too many)
    if (snapshot.gems) {
      const gemResult = this.validateGems(snapshot.gems, snapshot);
      issues.push(...gemResult.issues);
      fixedCount += gemResult.fixedCount;
    }

    // Cross-validation checks
    const crossResult = this.crossValidate(snapshot);
    issues.push(...crossResult.issues);

    // Limit issues per frame
    const limitedIssues = issues.slice(0, this.config.maxIssuesPerFrame);

    // Store in history
    this.addToHistory(limitedIssues);

    // Log if configured
    if (this.config.logIssues && limitedIssues.length > 0) {
      this.logIssues(limitedIssues);
    }

    // Emit events if configured
    if (this.config.emitEvents && limitedIssues.length > 0) {
      EventBus.emit('gameplayValidation', {
        issues: limitedIssues,
        fixedCount,
        timestamp: snapshot.timestamp,
      });
    }

    return {
      isValid: limitedIssues.length === 0,
      issues: limitedIssues,
      fixedCount,
    };
  }

  // ============================================================================
  // INDIVIDUAL VALIDATORS
  // ============================================================================

  validatePlayer(
    player: Player,
    snapshot: GameplaySnapshot
  ): { issues: ValidationIssue[]; fixedCount: number; player: Player } {
    const issues: ValidationIssue[] = [];
    let fixedCount = 0;
    let currentPlayer = player;

    for (const rule of PLAYER_RULES) {
      if (!rule.check(currentPlayer, snapshot)) {
        const issue = this.createIssue(rule, currentPlayer);

        if (this.config.autoFix && rule.fix) {
          currentPlayer = rule.fix(currentPlayer);
          issue.autoFixed = true;
          fixedCount++;
        }

        issues.push(issue);
      }
    }

    return { issues, fixedCount, player: currentPlayer };
  }

  validateMarketData(
    marketData: MarketData,
    snapshot: GameplaySnapshot
  ): { issues: ValidationIssue[]; fixedCount: number } {
    const issues: ValidationIssue[] = [];
    const fixedCount = 0;

    for (const rule of MARKET_RULES) {
      if (!rule.check(marketData, snapshot)) {
        issues.push(this.createIssue(rule, marketData));
      }
    }

    return { issues, fixedCount };
  }

  validateEnemies(
    enemies: Enemy[],
    snapshot: GameplaySnapshot
  ): { issues: ValidationIssue[]; fixedCount: number; enemies: Enemy[] } {
    const issues: ValidationIssue[] = [];
    let fixedCount = 0;
    const updatedEnemies = [...enemies];

    // Sample enemies if too many (performance)
    const sampleSize = Math.min(enemies.length, 100);
    const step = Math.max(1, Math.floor(enemies.length / sampleSize));

    for (let i = 0; i < enemies.length && issues.length < 20; i += step) {
      const enemy = enemies[i];
      if (!enemy.active) continue;

      for (const rule of ENEMY_RULES) {
        if (!rule.check(enemy, snapshot)) {
          const issue = this.createIssue(rule, enemy);

          if (this.config.autoFix && rule.fix) {
            updatedEnemies[i] = rule.fix(enemy);
            issue.autoFixed = true;
            fixedCount++;
          }

          issues.push(issue);
        }
      }
    }

    return { issues, fixedCount, enemies: updatedEnemies };
  }

  validateGems(
    gems: Gem[],
    snapshot: GameplaySnapshot
  ): { issues: ValidationIssue[]; fixedCount: number; gems: Gem[] } {
    const issues: ValidationIssue[] = [];
    let fixedCount = 0;
    const updatedGems = [...gems];

    const sampleSize = Math.min(gems.length, 50);
    const step = Math.max(1, Math.floor(gems.length / sampleSize));

    for (let i = 0; i < gems.length && issues.length < 10; i += step) {
      const gem = gems[i];
      if (!gem.active) continue;

      for (const rule of GEM_RULES) {
        if (!rule.check(gem, snapshot)) {
          const issue = this.createIssue(rule, gem);

          if (this.config.autoFix && rule.fix) {
            updatedGems[i] = rule.fix(gem);
            issue.autoFixed = true;
            fixedCount++;
          }

          issues.push(issue);
        }
      }
    }

    return { issues, fixedCount, gems: updatedGems };
  }

  // ============================================================================
  // CROSS-VALIDATION
  // ============================================================================

  private crossValidate(snapshot: GameplaySnapshot): { issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];

    // Check: Game should be PLAYING if player HP > 0
    if (
      snapshot.player &&
      snapshot.gameStatus === GameStatus.PLAYING &&
      snapshot.player.hp <= 0
    ) {
      issues.push({
        id: `cross.${++this.issueCounter}`,
        category: 'state',
        severity: 'critical',
        message: 'Game status is PLAYING but player HP is <= 0',
        field: 'gameStatus',
        expected: GameStatus.GAMEOVER,
        actual: snapshot.gameStatus,
        autoFixed: false,
        timestamp: snapshot.timestamp,
      });
    }

    // Check: Market difficulty should correlate with leverage
    if (snapshot.marketData && snapshot.player) {
      const expectedMinDifficulty = snapshot.marketData.leverage > 10 ? 2 : 0;
      if (snapshot.marketData.difficulty < expectedMinDifficulty) {
        issues.push({
          id: `cross.${++this.issueCounter}`,
          category: 'market',
          severity: 'warning',
          message: `High leverage (${snapshot.marketData.leverage}x) but low difficulty (${snapshot.marketData.difficulty})`,
          autoFixed: false,
          timestamp: snapshot.timestamp,
        });
      }
    }

    // Check: EXP should be less than nextLevelExp
    if (snapshot.player && snapshot.player.exp >= snapshot.player.nextLevelExp) {
      issues.push({
        id: `cross.${++this.issueCounter}`,
        category: 'player',
        severity: 'warning',
        message: `Player EXP (${snapshot.player.exp}) >= nextLevelExp (${snapshot.player.nextLevelExp}) - level up pending?`,
        autoFixed: false,
        timestamp: snapshot.timestamp,
      });
    }

    return { issues };
  }

  // ============================================================================
  // QUICK SINGLE-ENTITY VALIDATORS (For real-time use)
  // ============================================================================

  /**
   * Quick check for player state - can be called frequently
   * Returns true if valid, false if issues found
   */
  quickCheckPlayer(player: Player): boolean {
    return (
      player.hp >= 0 &&
      player.hp <= player.maxHp &&
      player.maxHp > 0 &&
      !isNaN(player.x) &&
      !isNaN(player.y) &&
      player.level >= 1
    );
  }

  /**
   * Quick check for enemy state
   */
  quickCheckEnemy(enemy: Enemy): boolean {
    if (!enemy.active) return true;
    return (
      enemy.health >= 0 && enemy.maxHealth > 0 && !isNaN(enemy.x) && !isNaN(enemy.y)
    );
  }

  /**
   * Quick check for market data
   */
  quickCheckMarketData(marketData: MarketData): boolean {
    return (
      marketData.price > 0 &&
      isFinite(marketData.price) &&
      !isNaN(marketData.pnl) &&
      !isNaN(marketData.effectivePnl)
    );
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private createIssue<T>(rule: ValidationRule<T>, data: T): ValidationIssue {
    const message =
      typeof rule.message === 'function' ? rule.message(data) : rule.message;

    return {
      id: `${rule.id}.${++this.issueCounter}`,
      category: rule.category,
      severity: rule.severity,
      message,
      autoFixed: false,
      timestamp: performance.now(),
    };
  }

  private addToHistory(issues: ValidationIssue[]): void {
    this.issueHistory.push(...issues);
    if (this.issueHistory.length > this.maxHistorySize) {
      this.issueHistory = this.issueHistory.slice(-this.maxHistorySize);
    }
  }

  private logIssues(issues: ValidationIssue[]): void {
    const criticals = issues.filter(i => i.severity === 'critical');
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');

    if (criticals.length > 0) {
      Logger.error('[GameplayValidator] Critical issues detected', {
        issues: criticals,
      });
    }
    if (errors.length > 0) {
      Logger.warn('[GameplayValidator] Errors detected', { issues: errors });
    }
    if (warnings.length > 0) {
      Logger.debug('[GameplayValidator] Warnings', { count: warnings.length });
    }
  }

  // ============================================================================
  // DIAGNOSTICS
  // ============================================================================

  getIssueHistory(): readonly ValidationIssue[] {
    return [...this.issueHistory];
  }

  getIssueSummary(): Record<ValidationCategory, number> {
    const summary: Record<ValidationCategory, number> = {
      player: 0,
      market: 0,
      enemy: 0,
      gem: 0,
      ui: 0,
      state: 0,
      performance: 0,
    };

    for (const issue of this.issueHistory) {
      summary[issue.category]++;
    }

    return summary;
  }

  clearHistory(): void {
    this.issueHistory = [];
    this.issueCounter = 0;
    Logger.info('[GameplayValidator] History cleared');
  }

  /**
   * Get debug state for admin panel
   */
  getDebugState(): {
    config: ValidationConfig;
    historySize: number;
    summary: Record<ValidationCategory, number>;
    recentIssues: ValidationIssue[];
  } {
    return {
      config: { ...this.config },
      historySize: this.issueHistory.length,
      summary: this.getIssueSummary(),
      recentIssues: this.issueHistory.slice(-10),
    };
  }

  // ============================================================================
  // RESET
  // ============================================================================

  reset(): void {
    this.clearHistory();
    this.lastValidationTime = 0;
    Logger.info('[GameplayValidator] Reset complete');
  }
}

// Export singleton instance
export const GameplayValidator = GameplayValidatorClass.getInstance();

// Export class for testing
export { GameplayValidatorClass };
