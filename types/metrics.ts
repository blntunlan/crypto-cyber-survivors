/**
 * Metrics Types - Type definitions for the metrics collection system
 * 
 * Comprehensive types for tracking Bitcoin impact, difficulty,
 * player performance, and game analytics.
 */

import { MarketPosition } from '../types';

// ============= Enums =============

export enum MetricCategory {
    BITCOIN = 'bitcoin',
    DIFFICULTY = 'difficulty',
    PLAYER = 'player',
    COMBO = 'combo',
    CARD = 'card',
    ENEMY = 'enemy',
    SESSION = 'session',
}

export enum GameEndReason {
    DEATH = 'death',
    QUIT = 'quit',
    DISCONNECT = 'disconnect',
}

export type WavePhase = 'calm' | 'building' | 'intense' | 'peak';

// ============= Bitcoin Metrics =============

export interface BitcoinMetrics {
    priceAtStart: number;
    priceAtEnd: number;
    priceChange: number; // Percentage
    maxPnL: number;
    minPnL: number;
    averagePnL: number;
    volatilityScore: number; // Average ATR
    positionChosen: MarketPosition;
    leverage: number;
    pnlAtDeath: number;
    effectivePnLAtDeath: number;
    pnlSamples: number[]; // For correlation analysis
    atrSamples: number[];
}

// ============= Difficulty Metrics =============

export interface DifficultyMetrics {
    averageDifficulty: number;
    maxDifficulty: number;
    difficultyAtDeath: number;
    timeInEachWavePhase: Record<WavePhase, number>; // ms
    timeInHighDifficulty: number; // ms (difficulty > 5)
    timeInLowDifficulty: number; // ms (difficulty < 2)
    nearDeathActivations: number;
    difficultySamples: number[]; // For correlation analysis
    wavePhaseTransitions: Array<{ phase: WavePhase; timestamp: number }>;
}

// ============= Player Metrics =============

export interface PlayerMetrics {
    totalKills: number;
    survivalTimeMs: number;
    maxLevel: number;
    damageDealt: number;
    damageTaken: number;
    healingReceived: number;
    gemsCollected: number;
    expEarned: number;
    criticalHits: number;
    superCriticalHits: number;
    bulletsFired: number;
    hpAtDeath: number;
    finalStats: {
        damage: number;
        fireRate: number;
        speed: number;
        luck: number;
        critChance: number;
        critDamage: number;
    };
}

// ============= Combo Metrics =============

export interface ComboMetrics {
    maxStreak: number;
    averageStreak: number;
    streakSamples: number[];
    milestonesReached: string[];
    comboTimeouts: number;
    totalBonusXp: number;
    longestComboTime: number; // ms
}

// ============= Card Metrics =============

export interface CardMetrics {
    cardsChosen: Array<{ card: string; tier: string; level: number }>;
    cardsByTier: Record<string, number>;
    levelUpCount: number;
    averageTimeToLevelUp: number;
    timesBetweenLevelUps: number[];
}

// ============= Enemy Metrics =============

export interface EnemyMetrics {
    killsByType: Record<string, number>;
    maxEnemiesOnScreen: number;
    averageEnemyLifetime: number;
    spawnsTotal: number;
    enemyLifetimeSamples: number[];
}

// ============= Session Metrics =============

export interface SessionMetrics {
    sessionId: string;
    sessionTimestamp: number;
    gameEndReason: GameEndReason;
    bitcoin: BitcoinMetrics;
    difficulty: DifficultyMetrics;
    player: PlayerMetrics;
    combo: ComboMetrics;
    card: CardMetrics;
    enemy: EnemyMetrics;
}

// ============= Real-time Tracking State =============

export interface MetricsState {
    sessionId: string;
    sessionStartTime: number;
    isActive: boolean;

    // Real-time accumulators
    lastUpdateTime: number;
    pnlHistory: Array<{ time: number; value: number }>;
    difficultyHistory: Array<{ time: number; value: number }>;
    atrHistory: Array<{ time: number; value: number }>;
    currentWavePhase: WavePhase;
    wavePhaseStartTime: number;

    // Counters
    totalDamageDealt: number;
    totalDamageTaken: number;
    totalHealing: number;
    totalGems: number;
    totalExp: number;
    totalCrits: number;
    totalSuperCrits: number;
    totalBullets: number;
    totalSpawns: number;

    // High-water marks
    maxEnemiesOnScreen: number;
    maxPnL: number;
    minPnL: number;
    maxDifficulty: number;
    maxStreak: number;

    // Wave phase tracking
    wavePhaseTime: Record<WavePhase, number>;

    // Near-death tracking
    nearDeathActivations: number;
    highDifficultyTime: number;
    lowDifficultyTime: number;

    // Kill tracking
    killsByType: Record<string, number>;
    enemyLifetimes: number[];

    // Card tracking
    cardsChosen: Array<{ card: string; tier: string; level: number }>;
    levelUpTimes: number[];
    lastLevelUpTime: number;

    // Combo tracking
    streakHistory: number[];
    comboTimeouts: number;
    mileStonesReached: string[];
    currentComboStartTime: number;
    longestComboTime: number;
    totalBonusXp: number;
}

// ============= Analysis & Insights =============

export interface BitcoinInsights {
    positionSuccessRate: Record<MarketPosition, {
        avgSurvival: number;
        avgLevel: number;
        gamesPlayed: number;
    }>;
    survivalByPnL: Array<{
        pnlRange: string; // e.g., "-10% to -5%"
        avgSurvival: number;
        avgLevel: number;
        count: number;
    }>;
    volatilityImpact: {
        lowVolatility: { avgSurvival: number; avgLevel: number; count: number };
        mediumVolatility: { avgSurvival: number; avgLevel: number; count: number };
        highVolatility: { avgSurvival: number; avgLevel: number; count: number };
    };
    pnlDifficultyCorrelation: number; // -1 to 1
}

export interface DifficultyInsights {
    deathsByDifficultyRange: Record<string, number>;
    nearDeathUsage: {
        totalActivations: number;
        avgPerGame: number;
        survivalRateAfter: number;
    };
    wavePhaseStats: Record<WavePhase, {
        avgTime: number;
        deathRate: number;
    }>;
    optimalDifficultyRange: {
        min: number;
        max: number;
        avgSurvival: number;
    };
}

export interface PlayerExperienceInsights {
    averageGameDuration: number;
    medianGameDuration: number;
    deathsByLevel: Record<number, number>;
    cardPopularity: Array<{
        card: string;
        tier: string;
        pickRate: number;
        winRateImpact: number;
    }>;
    comboEngagement: {
        averageMaxStreak: number;
        milestonesPerGame: number;
        bonusXpPerGame: number;
    };
    progressionSpeed: {
        avgLevelsPerMinute: number;
        avgKillsPerLevel: number;
    };
}

export interface GameInsights {
    bitcoin: BitcoinInsights;
    difficulty: DifficultyInsights;
    playerExperience: PlayerExperienceInsights;
    recommendations: string[];
}

// ============= Metric Event Types =============

export interface MetricEvent {
    timestamp: number;
    category: MetricCategory;
    eventType: string;
    data: Record<string, unknown>;
}

// ============= Export Formats =============

export interface MetricsExport {
    version: string;
    exportDate: string;
    totalSessions: number;
    sessions: SessionMetrics[];
    aggregatedInsights?: GameInsights;
}
