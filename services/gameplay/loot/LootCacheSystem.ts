import {
  LOOT_CACHE_CONFIG,
  getLootCacheRarityWeights,
} from '../../../config/LootCacheConfig';
import { type GameEnemy } from '../../../factories/EnemyFactory';
import { type Interactable } from '../../../types';
import {
  type LootCacheDebugMode,
  type LootCacheRarity,
  type LootCacheRewardId,
  type LootCacheSource,
} from '../../../types/lootCache';
import { audio } from '../../audio';
import { TIER_CONFIG } from '../../cards/CardSystem';
import { EventBus } from '../../core/EventBus';
import { SeededRng } from '../../director/SeededRng';
import {
  type ILootCacheSystem,
  type LootCacheOpenInput,
  type LootCacheUpdateInput,
} from '../../interfaces/ILootCacheSystem';
import { type IAudioService } from '../../interfaces/IAudioService';
import { type IPoolManager } from '../../interfaces/IPoolManager';
import { BuffManager } from '../../patterns/decorators/BuffManager';
import { Logger } from '../../system/Logger';
import { LootCacheRewardApplicator } from './LootCacheRewardApplicator';
import {
  LootCacheRewardResolver,
  type LootCacheRandomSource,
} from './LootCacheRewardResolver';

const LOOT_CACHE_SEED_MASK = 0x4c4f4f54;
const POOL_RETRY_SECONDS = 5;
const FULL_CIRCLE_RADIANS = Math.PI * 2;

type ResettableLootCacheRandomSource = LootCacheRandomSource & {
  reset(seed: number): void;
};

type LootCacheAudio = Pick<
  IAudioService,
  | 'playSlotTick'
  | 'playAnticipation'
  | 'playSlotWin'
  | 'playJackpot'
  | 'playCoinShower'
  | 'playMultiplierChime'
>;

type LootCacheSystemDependencies = {
  rng?: ResettableLootCacheRandomSource;
  resolver?: Pick<LootCacheRewardResolver, 'resolve'>;
  applicator?: Pick<typeof LootCacheRewardApplicator, 'apply'>;
  eventBus?: Pick<typeof EventBus, 'on' | 'emit'>;
  audio?: LootCacheAudio;
  isOverclockActive?: () => boolean;
};

export class LootCacheSystem implements ILootCacheSystem {
  private readonly rng: ResettableLootCacheRandomSource;
  private readonly resolver: Pick<LootCacheRewardResolver, 'resolve'>;
  private readonly applicator: Pick<typeof LootCacheRewardApplicator, 'apply'>;
  private readonly eventBus: Pick<typeof EventBus, 'on' | 'emit'>;
  private readonly audio: LootCacheAudio;
  private readonly isOverclockActive: () => boolean;

  private nextSpawnSeconds = Number.POSITIVE_INFINITY;
  private currentWindowEarliestSeconds = Number.POSITIVE_INFINITY;
  private activeCache: Interactable | null = null;
  private activePool: IPoolManager | null = null;
  private pityMisses = 0;
  private cacheIdCounter = 0;
  private pendingDebugMode: LootCacheDebugMode | null = null;
  private poolRetryPending = false;
  private poolRetryAtSeconds = Number.POSITIVE_INFINITY;
  private poolRetryRarity: LootCacheRarity = 'common';
  private poolRetrySource: LootCacheSource = 'runtime';
  private poolRetryX = 0;
  private poolRetryY = 0;
  private poolRetryForceFragmentPreview = false;
  private comebackAccelerated = false;
  private pressureDeferred = false;
  private placementX = 0;
  private placementY = 0;
  private unsubscribeDebugRequest: (() => void) | null;
  private unsubscribeAfterReset: (() => void) | null;

  constructor(dependencies: LootCacheSystemDependencies = {}) {
    this.rng = dependencies.rng ?? new SeededRng(LOOT_CACHE_SEED_MASK);
    this.resolver = dependencies.resolver ?? new LootCacheRewardResolver(this.rng);
    this.applicator = dependencies.applicator ?? LootCacheRewardApplicator;
    this.eventBus = dependencies.eventBus ?? EventBus;
    this.audio = dependencies.audio ?? audio;
    this.isOverclockActive =
      dependencies.isOverclockActive ?? LootCacheSystem.hasOverclockContract;

    this.unsubscribeDebugRequest = this.eventBus.on(
      'debugLootCacheSpawnRequested',
      ({ mode }) => this.requestDebugSpawn(mode)
    );
    this.unsubscribeAfterReset = this.eventBus.on('afterReset', () => this.reset());
  }

  beginRun(seed: number, elapsedSeconds = 0): void {
    this.reset();
    this.rng.reset(seed ^ LOOT_CACHE_SEED_MASK);
    this.scheduleFirstWindow(elapsedSeconds);
  }

  update(input: LootCacheUpdateInput): void {
    if (this.activeCache !== null && !this.activeCache.active) {
      this.activeCache = null;
      this.activePool = null;
    }

    if (this.poolRetryPending) {
      this.updatePoolRetry(input);
      return;
    }

    if (this.pendingDebugMode !== null) {
      this.spawnPendingDebugCache(input);
      return;
    }

    if (this.activeCache !== null) {
      this.updateActiveCache(input);
      return;
    }

    if (!Number.isFinite(this.nextSpawnSeconds)) {
      return;
    }

    this.applyComebackAcceleration(input);
    if (input.elapsedSeconds < this.nextSpawnSeconds) {
      return;
    }

    if (
      !this.pressureDeferred &&
      this.countActiveEnemies(input.pool) >=
        LOOT_CACHE_CONFIG.smartWeights.highPressureEnemyCount
    ) {
      this.nextSpawnSeconds += LOOT_CACHE_CONFIG.spawn.pressureDeferralSeconds;
      this.pressureDeferred = true;
      return;
    }

    const rarity = this.selectRarity(input.elapsedSeconds);
    this.selectSafePlacement(input);
    this.acquireCache(
      input,
      rarity,
      'runtime',
      this.placementX,
      this.placementY,
      false
    );
  }

  tryOpen(cache: Interactable, input: LootCacheOpenInput): boolean {
    if (
      cache !== this.activeCache ||
      !cache.active ||
      cache.type !== 'LOOT_CRATE' ||
      cache.lootCachePhase !== 'closed' ||
      cache.lootCacheId === undefined ||
      cache.lootCacheRarity === undefined ||
      cache.lootCacheSource === undefined
    ) {
      return false;
    }

    const rarity = cache.lootCacheRarity;
    const source = cache.lootCacheSource;
    cache.lootCachePhase = 'anticipation';
    cache.lootCachePhaseElapsedMs = 0;
    cache.lootCacheIdleElapsedMs = 0;
    this.audio.playAnticipation();

    const resolution = this.resolver.resolve({
      elapsedSeconds: input.elapsedSeconds,
      rarity,
      hpRatio: this.getPlayerHpRatio(input.player.hp, input.player.maxHp),
      levelProgress: this.getLevelProgress(input.player.exp, input.player.nextLevelExp),
      enemyCount: this.countActiveEnemies(input.pool),
      overclockActive: this.isOverclockActive(),
      pityMisses: this.pityMisses,
      forceFragmentPreview:
        source === 'debug' && cache.lootCacheFragmentPreview === true,
    });

    cache.lootCachePrimaryReward = resolution.primaryReward;
    cache.lootCacheSecondaryReward = resolution.secondaryReward;
    cache.lootCacheFragmentPreview = resolution.fragmentAwarded;

    this.applyReward(resolution.primaryReward, resolution.rewardStrength, cache, input);
    if (
      resolution.secondaryReward !== null &&
      resolution.secondaryReward !== resolution.primaryReward
    ) {
      this.applyReward(
        resolution.secondaryReward,
        resolution.rewardStrength,
        cache,
        input
      );
    }

    if (source === 'runtime') {
      this.pityMisses = resolution.nextPityMisses;
    }

    if (!input.reducedMotion) {
      input.state.shake = Math.max(
        input.state.shake,
        LOOT_CACHE_CONFIG.feedback.shake[rarity]
      );
    }

    this.eventBus.emit('lootCacheOpened', {
      cacheId: cache.lootCacheId,
      rarity,
      primaryReward: resolution.primaryReward,
      secondaryReward: resolution.secondaryReward,
      x: cache.x,
      y: cache.y,
      elapsedSeconds: input.elapsedSeconds,
      source,
    });
    if (source === 'runtime' && resolution.persistFragment) {
      this.eventBus.emit('cosmeticFragmentEarned', {
        amount: 1,
        rarity,
        elapsedSeconds: input.elapsedSeconds,
        source: 'runtime',
      });
    }
    if (source === 'runtime') {
      this.scheduleRepeatWindow(input.elapsedSeconds);
    }

    return true;
  }

  requestDebugSpawn(mode: LootCacheDebugMode): void {
    this.pendingDebugMode = mode;
  }

  reset(): void {
    this.releaseActiveCache();
    this.nextSpawnSeconds = Number.POSITIVE_INFINITY;
    this.currentWindowEarliestSeconds = Number.POSITIVE_INFINITY;
    this.pityMisses = 0;
    this.cacheIdCounter = 0;
    this.pendingDebugMode = null;
    this.clearPoolRetry();
    this.comebackAccelerated = false;
    this.pressureDeferred = false;
    this.placementX = 0;
    this.placementY = 0;
  }

  dispose(): void {
    this.unsubscribeDebugRequest?.();
    this.unsubscribeAfterReset?.();
    this.unsubscribeDebugRequest = null;
    this.unsubscribeAfterReset = null;
    this.reset();
  }

  private static hasOverclockContract(): boolean {
    return BuffManager.hasEffect('Overclock Contract');
  }

  private scheduleFirstWindow(elapsedSeconds: number): void {
    const window = LOOT_CACHE_CONFIG.spawn.firstWindowSeconds;
    this.currentWindowEarliestSeconds = elapsedSeconds + window.min;
    this.nextSpawnSeconds =
      elapsedSeconds + window.min + this.rng.nextFloat() * (window.max - window.min);
    this.comebackAccelerated = false;
    this.pressureDeferred = false;
  }

  private scheduleRepeatWindow(elapsedSeconds: number): void {
    const window = LOOT_CACHE_CONFIG.spawn.repeatWindowSeconds;
    this.currentWindowEarliestSeconds = elapsedSeconds + window.min;
    this.nextSpawnSeconds =
      elapsedSeconds + window.min + this.rng.nextFloat() * (window.max - window.min);
    this.comebackAccelerated = false;
    this.pressureDeferred = false;
  }

  private applyComebackAcceleration(input: LootCacheUpdateInput): void {
    const hpRatio = this.getPlayerHpRatio(input.player.hp, input.player.maxHp);
    if (
      this.comebackAccelerated ||
      !Number.isFinite(hpRatio) ||
      hpRatio >= LOOT_CACHE_CONFIG.spawn.criticalHpRatio
    ) {
      return;
    }

    this.nextSpawnSeconds = Math.max(
      this.currentWindowEarliestSeconds,
      this.nextSpawnSeconds - LOOT_CACHE_CONFIG.spawn.comebackAccelerationSeconds
    );
    this.comebackAccelerated = true;
  }

  private spawnPendingDebugCache(input: LootCacheUpdateInput): void {
    const mode = this.pendingDebugMode;
    const replacedUnopenedRuntimeCache =
      this.activeCache?.lootCacheSource === 'runtime' &&
      this.activeCache.lootCachePhase === 'closed';
    this.releaseActiveCache();
    if (mode === null) {
      return;
    }

    const rarity =
      mode === 'jackpot' ? 'legendary' : this.selectRarity(input.elapsedSeconds);
    const padding = LOOT_CACHE_CONFIG.spawn.viewportPadding;
    const minX = Math.min(padding, input.width * 0.5);
    const maxX = Math.max(minX, input.width - padding);
    const minY = Math.min(padding, input.height * 0.5);
    const maxY = Math.max(minY, input.height - padding);
    const x = Math.min(
      maxX,
      Math.max(minX, input.player.x + LOOT_CACHE_CONFIG.feedback.proximityRadius)
    );
    const y = Math.min(maxY, Math.max(minY, input.player.y));

    const acquired = this.acquireCache(
      input,
      rarity,
      'debug',
      x,
      y,
      mode === 'jackpot'
    );
    if (replacedUnopenedRuntimeCache) {
      this.scheduleRepeatWindow(input.elapsedSeconds);
    }
    if (acquired) {
      this.pendingDebugMode = null;
    }
  }

  private updatePoolRetry(input: LootCacheUpdateInput): void {
    if (input.elapsedSeconds < this.poolRetryAtSeconds) {
      return;
    }

    const source = this.poolRetrySource;
    if (
      this.acquireCache(
        input,
        this.poolRetryRarity,
        source,
        this.poolRetryX,
        this.poolRetryY,
        this.poolRetryForceFragmentPreview
      ) &&
      source === 'debug'
    ) {
      this.pendingDebugMode = null;
    }
  }

  private selectRarity(elapsedSeconds: number): LootCacheRarity {
    const weights = getLootCacheRarityWeights(elapsedSeconds);
    const total = weights.common + weights.rare + weights.epic + weights.legendary;
    let roll = this.rng.nextFloat() * total;
    if (roll < weights.common) {
      return 'common';
    }
    roll -= weights.common;
    if (roll < weights.rare) {
      return 'rare';
    }
    roll -= weights.rare;
    if (roll < weights.epic) {
      return 'epic';
    }
    return 'legendary';
  }

  private selectSafePlacement(input: LootCacheUpdateInput): void {
    const config = LOOT_CACHE_CONFIG.spawn;
    const minX = Math.min(config.viewportPadding, input.width * 0.5);
    const maxX = Math.max(minX, input.width - config.viewportPadding);
    const minY = Math.min(config.viewportPadding, input.height * 0.5);
    const maxY = Math.max(minY, input.height - config.viewportPadding);

    for (let attempt = 0; attempt < config.placementAttempts; attempt++) {
      const angle = this.rng.nextFloat() * FULL_CIRCLE_RADIANS;
      const distance =
        config.minimumPlayerDistance +
        this.rng.nextFloat() *
          (config.maximumPlayerDistance - config.minimumPlayerDistance);
      this.placementX = Math.min(
        maxX,
        Math.max(minX, input.player.x + Math.cos(angle) * distance)
      );
      this.placementY = Math.min(
        maxY,
        Math.max(minY, input.player.y + Math.sin(angle) * distance)
      );

      if (!this.overlapsEnemy(input.pool, this.placementX, this.placementY)) {
        return;
      }
    }
  }

  private overlapsEnemy(pool: IPoolManager, x: number, y: number): boolean {
    const enemies = pool.activeEnemies;
    for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex++) {
      const enemy = enemies[enemyIndex]!;
      if (!enemy.active || enemy.isDying) {
        continue;
      }
      const deltaX = enemy.x - x;
      const deltaY = enemy.y - y;
      const clearance = enemy.radius + LOOT_CACHE_CONFIG.spawn.enemyClearance;
      if (deltaX * deltaX + deltaY * deltaY < clearance * clearance) {
        return true;
      }
    }
    return false;
  }

  private acquireCache(
    input: LootCacheUpdateInput,
    rarity: LootCacheRarity,
    source: LootCacheSource,
    x: number,
    y: number,
    forceFragmentPreview: boolean
  ): boolean {
    const nextCacheId = this.cacheIdCounter + 1;
    let cache: Interactable;
    try {
      cache = input.pool.getLootCache(
        nextCacheId,
        rarity,
        source,
        x,
        y,
        TIER_CONFIG[rarity].color
      );
    } catch (error) {
      this.activeCache = null;
      this.activePool = null;
      this.setPoolRetry(
        input.elapsedSeconds,
        rarity,
        source,
        x,
        y,
        forceFragmentPreview
      );
      Logger.warn('[LootCacheSystem] Market Cache pool acquire failed', error);
      return false;
    }

    this.clearPoolRetry();
    this.cacheIdCounter = nextCacheId;
    cache.lootCacheFragmentPreview = forceFragmentPreview;
    this.activeCache = cache;
    this.activePool = input.pool;
    this.eventBus.emit('lootCacheSpawned', {
      cacheId: nextCacheId,
      rarity,
      x,
      y,
      source,
    });
    this.audio.playMultiplierChime(1);

    if (source === 'runtime') {
      this.nextSpawnSeconds = Number.POSITIVE_INFINITY;
      this.currentWindowEarliestSeconds = Number.POSITIVE_INFINITY;
    }
    return true;
  }

  private setPoolRetry(
    elapsedSeconds: number,
    rarity: LootCacheRarity,
    source: LootCacheSource,
    x: number,
    y: number,
    forceFragmentPreview: boolean
  ): void {
    this.poolRetryPending = true;
    this.poolRetryAtSeconds = elapsedSeconds + POOL_RETRY_SECONDS;
    this.poolRetryRarity = rarity;
    this.poolRetrySource = source;
    this.poolRetryX = x;
    this.poolRetryY = y;
    this.poolRetryForceFragmentPreview = forceFragmentPreview;
  }

  private clearPoolRetry(): void {
    this.poolRetryPending = false;
    this.poolRetryAtSeconds = Number.POSITIVE_INFINITY;
    this.poolRetryRarity = 'common';
    this.poolRetrySource = 'runtime';
    this.poolRetryX = 0;
    this.poolRetryY = 0;
    this.poolRetryForceFragmentPreview = false;
  }

  private updateActiveCache(input: LootCacheUpdateInput): void {
    const cache = this.activeCache;
    if (cache === null) {
      return;
    }

    const deltaMs =
      Number.isFinite(input.deltaMs) && input.deltaMs > 0 ? input.deltaMs : 0;
    if (cache.lootCachePhase === 'closed') {
      cache.lootCacheIdleElapsedMs = (cache.lootCacheIdleElapsedMs ?? 0) + deltaMs;
      const deltaX = cache.x - input.player.x;
      const deltaY = cache.y - input.player.y;
      const proximityRadius = LOOT_CACHE_CONFIG.feedback.proximityRadius;
      const isNear =
        deltaX * deltaX + deltaY * deltaY <= proximityRadius * proximityRadius;
      if (!isNear) {
        cache.lootCacheProximity = false;
        cache.lootCacheProximityTickElapsedMs = 0;
        return;
      }

      let tickElapsedMs = (cache.lootCacheProximityTickElapsedMs ?? 0) + deltaMs;
      if (cache.lootCacheProximity !== true) {
        this.audio.playSlotTick();
        tickElapsedMs = 0;
      } else {
        const distanceRatio = Math.min(
          1,
          Math.sqrt(deltaX * deltaX + deltaY * deltaY) / proximityRadius
        );
        const tickIntervals = LOOT_CACHE_CONFIG.feedback.proximityTickIntervalMs;
        const tickIntervalMs =
          tickIntervals.near +
          (tickIntervals.edge - tickIntervals.near) * distanceRatio;
        if (tickElapsedMs >= tickIntervalMs) {
          this.audio.playSlotTick();
          tickElapsedMs %= tickIntervalMs;
        }
      }
      cache.lootCacheProximityTickElapsedMs = tickElapsedMs;
      cache.lootCacheProximity = true;
      return;
    }

    cache.lootCachePhaseElapsedMs = (cache.lootCachePhaseElapsedMs ?? 0) + deltaMs;
    let elapsedMs = cache.lootCachePhaseElapsedMs;
    if (
      cache.lootCachePhase === 'anticipation' &&
      elapsedMs >= LOOT_CACHE_CONFIG.feedback.anticipationMs
    ) {
      const openingElapsedMs = elapsedMs - LOOT_CACHE_CONFIG.feedback.anticipationMs;
      cache.lootCachePhase = 'opening';
      cache.lootCachePhaseElapsedMs = 0;
      cache.lootCacheCoreFlashPending = true;
      elapsedMs = 0;
      if (cache.lootCacheRarity !== undefined) {
        const rarity = cache.lootCacheRarity;
        this.eventBus.emit('hitStop', {
          duration: LOOT_CACHE_CONFIG.feedback.hitStopMs[rarity],
          isCrit: rarity !== 'common',
          isSuperCrit: rarity === 'legendary',
        });
      }
      this.spawnOpeningBurst(
        input.pool,
        cache,
        input.showParticles,
        input.particleMultiplier
      );
      if (openingElapsedMs > 0) {
        cache.lootCachePhaseElapsedMs = openingElapsedMs;
        elapsedMs = openingElapsedMs;
      }
    }

    const rewardTransitionMs =
      LOOT_CACHE_CONFIG.feedback.totalOpeningMs *
        LOOT_CACHE_CONFIG.feedback.rewardPhaseProgress -
      LOOT_CACHE_CONFIG.feedback.anticipationMs;
    if (cache.lootCachePhase === 'opening' && elapsedMs >= rewardTransitionMs) {
      cache.lootCachePhase = 'reward';
      this.spawnRewardSymbols(
        input.pool,
        cache,
        input.player.x,
        input.player.y,
        input.reducedMotion
      );
      this.playRewardFinish(cache.lootCacheRarity);
    }

    const releaseTransitionMs =
      LOOT_CACHE_CONFIG.feedback.totalOpeningMs -
      LOOT_CACHE_CONFIG.feedback.anticipationMs;
    if (elapsedMs >= releaseTransitionMs) {
      this.releaseActiveCache();
    }
  }

  private spawnOpeningBurst(
    pool: IPoolManager,
    cache: Interactable,
    showParticles: boolean,
    particleMultiplier: number
  ): void {
    const rarity = cache.lootCacheRarity;
    if (
      rarity === undefined ||
      !showParticles ||
      !Number.isFinite(particleMultiplier) ||
      particleMultiplier <= 0
    ) {
      return;
    }

    const particleCount = Math.round(
      LOOT_CACHE_CONFIG.feedback.particles[rarity] * particleMultiplier
    );
    for (let particleIndex = 0; particleIndex < particleCount; particleIndex++) {
      const angle = this.rng.nextFloat() * FULL_CIRCLE_RADIANS;
      try {
        pool.getParticle(
          cache.x,
          cache.y,
          Math.cos(angle),
          Math.sin(angle),
          cache.color,
          true
        );
      } catch {
        break;
      }
    }

    try {
      pool.getImpactRing(
        cache.x,
        cache.y,
        cache.radius,
        LOOT_CACHE_CONFIG.feedback.proximityRadius,
        cache.color,
        cache.health
      );
    } catch {
      return;
    }
  }

  private spawnRewardSymbols(
    pool: IPoolManager,
    cache: Interactable,
    playerX: number,
    playerY: number,
    reducedMotion: boolean
  ): void {
    if (cache.lootCachePrimaryReward !== undefined) {
      this.spawnRewardSymbol(
        pool,
        cache,
        cache.lootCachePrimaryReward,
        true,
        playerX,
        playerY,
        reducedMotion
      );
    }
    if (
      cache.lootCacheSecondaryReward !== undefined &&
      cache.lootCacheSecondaryReward !== null &&
      cache.lootCacheSecondaryReward !== cache.lootCachePrimaryReward
    ) {
      this.spawnRewardSymbol(
        pool,
        cache,
        cache.lootCacheSecondaryReward,
        false,
        playerX,
        playerY,
        reducedMotion
      );
    }
    if (cache.lootCacheFragmentPreview === true) {
      this.spawnFragmentSymbol(pool, cache, playerX, playerY, reducedMotion);
    }
  }

  private spawnRewardSymbol(
    pool: IPoolManager,
    cache: Interactable,
    reward: LootCacheRewardId,
    isPrimary: boolean,
    playerX: number,
    playerY: number,
    reducedMotion: boolean
  ): void {
    const presentation = LOOT_CACHE_CONFIG.presentation;
    const velocityX = reducedMotion
      ? 0
      : this.getTravelVelocity(playerX - cache.x, playerY - cache.y, true);
    const velocityY = reducedMotion
      ? 0
      : this.getTravelVelocity(playerX - cache.x, playerY - cache.y, false);
    try {
      const visual = pool.getFloatingText(
        cache.x,
        cache.y + (isPrimary ? 0 : presentation.secondaryOffsetY),
        presentation.rewardLabels[reward],
        cache.color,
        isPrimary ? presentation.primaryTextSizePx : presentation.secondaryTextSizePx,
        isPrimary,
        velocityX,
        velocityY
      );
      visual.stationary = reducedMotion;
      visual.alwaysVisible = true;
      visual.velocityOnly = true;
    } catch {
      return;
    }
  }

  private spawnFragmentSymbol(
    pool: IPoolManager,
    cache: Interactable,
    playerX: number,
    playerY: number,
    reducedMotion: boolean
  ): void {
    const presentation = LOOT_CACHE_CONFIG.presentation;
    const velocityX = reducedMotion
      ? 0
      : this.getTravelVelocity(playerX - cache.x, playerY - cache.y, true);
    const velocityY = reducedMotion
      ? 0
      : this.getTravelVelocity(playerX - cache.x, playerY - cache.y, false);
    try {
      const visual = pool.getFloatingText(
        cache.x,
        cache.y + presentation.fragmentOffsetY,
        presentation.fragmentLabel,
        cache.color,
        presentation.fragmentTextSizePx,
        true,
        velocityX,
        velocityY
      );
      visual.stationary = reducedMotion;
      visual.alwaysVisible = true;
      visual.velocityOnly = true;
    } catch {
      return;
    }
  }

  private getTravelVelocity(
    deltaX: number,
    deltaY: number,
    horizontal: boolean
  ): number {
    const distance = Math.max(1, Math.sqrt(deltaX * deltaX + deltaY * deltaY));
    const component = horizontal ? deltaX : deltaY;
    return (component / distance) * LOOT_CACHE_CONFIG.presentation.travelSpeed;
  }

  private playRewardFinish(rarity: LootCacheRarity | undefined): void {
    if (rarity === 'common') {
      this.audio.playMultiplierChime(2);
      return;
    }
    if (rarity === 'legendary') {
      this.audio.playJackpot();
      this.audio.playCoinShower();
      return;
    }
    this.audio.playSlotWin();
  }

  private applyReward(
    reward: LootCacheRewardId,
    strength: number,
    cache: Interactable,
    input: LootCacheOpenInput
  ): void {
    this.applicator.apply(reward, strength, {
      pool: input.pool,
      player: input.player,
      state: input.state,
      x: cache.x,
      y: cache.y,
      random: this.rng,
    });
  }

  private countActiveEnemies(pool: IPoolManager): number {
    const enemies = pool.activeEnemies;
    let count = 0;
    for (let enemyIndex = 0; enemyIndex < enemies.length; enemyIndex++) {
      if (this.isActiveEnemy(enemies[enemyIndex]!)) {
        count++;
      }
    }
    return count;
  }

  private isActiveEnemy(enemy: GameEnemy): boolean {
    return enemy.active && !enemy.isDying;
  }

  private getPlayerHpRatio(hp: number, maxHp: number): number {
    if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp <= 0) {
      return Number.NaN;
    }
    return Math.min(1, Math.max(0, hp / maxHp));
  }

  private getLevelProgress(exp: number, nextLevelExp: number): number {
    if (!Number.isFinite(exp) || !Number.isFinite(nextLevelExp) || nextLevelExp <= 0) {
      return Number.NaN;
    }
    return Math.min(1, Math.max(0, exp / nextLevelExp));
  }

  private releaseActiveCache(): void {
    const cache = this.activeCache;
    const pool = this.activePool;
    this.activeCache = null;
    this.activePool = null;
    if (cache !== null && pool !== null && cache.active) {
      pool.releaseInteractable(cache);
    }
  }
}
