import { DIFFICULTY_RUNTIME_CONFIG } from '../../../config/difficulty/DifficultyRuntimeConfig';
import { type EventDataMap, type PlayerHitEvent } from '../../../types/events';
import { type CanonicalMarketFrame } from '../../../types/marketCanonical';
import {
  type DifficultyRevisionVector,
  type DifficultyRunConstants,
  type DifficultyRuntimeInputView,
  type DifficultyWorldPressure,
} from './contracts';

type MutablePlayerTelemetry = {
  damageTaken: number;
  remainingHp: number;
  killsInWindow: number;
  dashesInWindow: number;
  shotsInWindow: number;
  level: number;
  windowSeconds: number;
};

type MutableInputView = {
  revisions: DifficultyRevisionVector;
  market: { frame: CanonicalMarketFrame | null };
  player: MutablePlayerTelemetry;
  run: { constants: DifficultyRunConstants | null; greedLevel: number };
  world: DifficultyWorldPressure;
};

const createEmptyFrame = (): CanonicalMarketFrame => ({
  revision: 0,
  sequence: 0,
  sourceSequence: 0,
  sourceTimestamp: 0,
  receivedAt: 0,
  quality: 'STALE',
  price: 0,
  pnlPercent: 0,
  rsi: 50,
  rsiState: 'NEUTRAL',
  atrPercent: 0,
  normalizedVolume: 0,
  whaleTier: 0,
  macd: { value: 0, signal: 0, histogram: 0 },
  priceChangePercent: 0,
  trendStrength: 0,
  trendDirection: 'SIDEWAYS',
  source: 'fallback',
});

const copyFrame = (
  target: CanonicalMarketFrame,
  source: Readonly<CanonicalMarketFrame>
): void => {
  target.revision = source.revision;
  target.sequence = source.sequence;
  target.sourceSequence = source.sourceSequence;
  target.sourceTimestamp = source.sourceTimestamp;
  target.receivedAt = source.receivedAt;
  target.quality = source.quality;
  target.price = source.price;
  target.pnlPercent = source.pnlPercent;
  target.rsi = source.rsi;
  target.rsiState = source.rsiState;
  target.atrPercent = source.atrPercent;
  target.normalizedVolume = source.normalizedVolume;
  target.whaleTier = source.whaleTier;
  target.macd.value = source.macd.value;
  target.macd.signal = source.macd.signal;
  target.macd.histogram = source.macd.histogram;
  target.priceChangePercent = source.priceChangePercent;
  target.trendStrength = source.trendStrength;
  target.trendDirection = source.trendDirection;
  target.source = source.source;
};

const createEmptyRunConstants = (): DifficultyRunConstants => ({
  runId: '',
  seed: 0,
  side: 'LONG',
  leverage: 0,
  entryPrice: 0,
  liquidationPrice: 0,
});

const copyRunConstants = (
  target: DifficultyRunConstants,
  source: DifficultyRunConstants
): void => {
  target.runId = source.runId;
  target.seed = source.seed;
  target.side = source.side;
  target.leverage = source.leverage;
  target.entryPrice = source.entryPrice;
  target.liquidationPrice = source.liquidationPrice;
};

const runConstantsEqual = (
  left: DifficultyRunConstants,
  right: DifficultyRunConstants
): boolean =>
  left.runId === right.runId &&
  left.seed === right.seed &&
  left.side === right.side &&
  left.leverage === right.leverage &&
  left.entryPrice === right.entryPrice &&
  left.liquidationPrice === right.liquidationPrice;

const isFiniteRunConstants = (constants: DifficultyRunConstants): boolean =>
  constants.runId.length > 0 &&
  Number.isSafeInteger(constants.seed) &&
  constants.seed >= 0 &&
  Number.isFinite(constants.leverage) &&
  constants.leverage > 0 &&
  Number.isFinite(constants.entryPrice) &&
  constants.entryPrice > 0 &&
  Number.isFinite(constants.liquidationPrice) &&
  constants.liquidationPrice > 0;

const isFiniteFrame = (frame: Readonly<CanonicalMarketFrame>): boolean =>
  Number.isSafeInteger(frame.revision) &&
  Number.isSafeInteger(frame.sequence) &&
  Number.isSafeInteger(frame.sourceSequence) &&
  frame.revision >= 0 &&
  frame.sequence >= 0 &&
  frame.sourceSequence >= 0 &&
  Number.isFinite(frame.sourceTimestamp) &&
  Number.isFinite(frame.receivedAt) &&
  Number.isFinite(frame.price) &&
  Number.isFinite(frame.pnlPercent) &&
  Number.isFinite(frame.rsi) &&
  Number.isFinite(frame.atrPercent) &&
  Number.isFinite(frame.normalizedVolume) &&
  Number.isFinite(frame.macd.value) &&
  Number.isFinite(frame.macd.signal) &&
  Number.isFinite(frame.macd.histogram) &&
  Number.isFinite(frame.priceChangePercent) &&
  Number.isFinite(frame.trendStrength);

const NO_ELIGIBLE_TICK = Number.MAX_SAFE_INTEGER;

export class DifficultyInputInbox {
  private readonly pendingMarketFrame = createEmptyFrame();
  private readonly committedMarketFrame = createEmptyFrame();
  private readonly pendingRunConstants = createEmptyRunConstants();
  private readonly committedRunConstants = createEmptyRunConstants();
  private readonly revisions: DifficultyRevisionVector = {
    market: 0,
    player: 0,
    run: 0,
    world: 0,
  };
  private readonly playerView: MutablePlayerTelemetry = {
    damageTaken: 0,
    remainingHp: 0,
    killsInWindow: 0,
    dashesInWindow: 0,
    shotsInWindow: 0,
    level: 1,
    windowSeconds: DIFFICULTY_RUNTIME_CONFIG.inbox.killWindowSeconds,
  };
  private readonly worldView: DifficultyWorldPressure = {
    activeEnemies: 0,
    maximumEnemies: 0,
    activeEncounters: 0,
  };
  private readonly view: MutableInputView = {
    revisions: this.revisions,
    market: { frame: null },
    player: this.playerView,
    run: { constants: null, greedLevel: 0 },
    world: this.worldView,
  };

  private lastAcceptedSourceSequence = -1;
  private hasCommittedRun = false;
  private hasPendingRun = false;
  private marketDirty = false;
  private playerDirty = false;
  private worldDirty = false;
  private marketEligibleTick = NO_ELIGIBLE_TICK;
  private playerEligibleTick = NO_ELIGIBLE_TICK;
  private runEligibleTick = NO_ELIGIBLE_TICK;
  private greedEligibleTick = NO_ELIGIBLE_TICK;
  private worldEligibleTick = NO_ELIGIBLE_TICK;
  private resetEligibleTick = NO_ELIGIBLE_TICK;
  private cycleResetEligibleTick = NO_ELIGIBLE_TICK;
  private pendingDamageTaken = 0;
  private pendingRemainingHp = 0;
  private pendingKills = 0;
  private pendingDashes = 0;
  private pendingShots = 0;
  private pendingLevel = 1;
  private pendingGreedLevel = 0;
  private greedDirty = false;
  private lastGreedCanonicalSequence = -1;
  private lastGreedQuoteId = '';
  private pendingActiveEnemies = 0;
  private pendingMaximumEnemies = 0;
  private pendingActiveEncounters = 0;

  public initializeRun(
    constants: DifficultyRunConstants,
    eligibleFromTick: number
  ): void {
    if (!isFiniteRunConstants(constants) || !Number.isSafeInteger(eligibleFromTick)) {
      return;
    }
    if (
      (this.hasCommittedRun &&
        (this.committedRunConstants.runId !== constants.runId ||
          !runConstantsEqual(this.committedRunConstants, constants))) ||
      (this.hasPendingRun &&
        (this.pendingRunConstants.runId !== constants.runId ||
          !runConstantsEqual(this.pendingRunConstants, constants)))
    ) {
      return;
    }
    if (
      (this.hasCommittedRun &&
        runConstantsEqual(this.committedRunConstants, constants)) ||
      (this.hasPendingRun && runConstantsEqual(this.pendingRunConstants, constants))
    ) {
      return;
    }

    copyRunConstants(this.pendingRunConstants, constants);
    this.hasPendingRun = true;
    this.runEligibleTick = eligibleFromTick;
  }

  public recordAuthoritativeGreed(
    event: Pick<
      EventDataMap['cashOutDecisionCommitted'],
      'quoteId' | 'canonicalSequence' | 'greedLevel'
    >,
    eligibleFromTick: number
  ): void {
    const minimumGreedLevel = Math.max(
      this.view.run.greedLevel,
      this.pendingGreedLevel
    );
    if (
      event.quoteId.length === 0 ||
      !Number.isSafeInteger(event.canonicalSequence) ||
      event.canonicalSequence < 0 ||
      !Number.isSafeInteger(event.greedLevel) ||
      event.greedLevel <= minimumGreedLevel ||
      event.canonicalSequence < this.lastGreedCanonicalSequence ||
      event.quoteId === this.lastGreedQuoteId ||
      !Number.isSafeInteger(eligibleFromTick)
    ) {
      return;
    }

    this.pendingGreedLevel = event.greedLevel;
    this.lastGreedCanonicalSequence = event.canonicalSequence;
    this.lastGreedQuoteId = event.quoteId;
    this.greedDirty = true;
    this.greedEligibleTick = Math.min(this.greedEligibleTick, eligibleFromTick);
  }

  public recordMarketFrame(
    frame: Readonly<CanonicalMarketFrame>,
    eligibleFromTick: number
  ): void {
    if (
      !isFiniteFrame(frame) ||
      !Number.isSafeInteger(eligibleFromTick) ||
      frame.sourceSequence <= this.lastAcceptedSourceSequence
    ) {
      return;
    }

    copyFrame(this.pendingMarketFrame, frame);
    this.lastAcceptedSourceSequence = frame.sourceSequence;
    this.marketDirty = true;
    this.marketEligibleTick = eligibleFromTick;
  }

  public recordPlayerHit(event: PlayerHitEvent, eligibleFromTick: number): void {
    if (
      !Number.isFinite(event.damage) ||
      event.damage < 0 ||
      !Number.isFinite(event.remainingHp) ||
      event.remainingHp < 0 ||
      !Number.isSafeInteger(eligibleFromTick)
    ) {
      return;
    }

    this.pendingDamageTaken += event.damage;
    this.pendingRemainingHp = event.remainingHp;
    this.markPlayerDirty(eligibleFromTick);
  }

  public recordEnemyKilled(eligibleFromTick: number): void {
    if (!Number.isSafeInteger(eligibleFromTick)) return;
    this.pendingKills += 1;
    this.markPlayerDirty(eligibleFromTick);
  }

  public recordDash(event: EventDataMap['playerDash'], eligibleFromTick: number): void {
    if (
      !Number.isFinite(event.duration) ||
      !Number.isFinite(event.cooldown) ||
      !Number.isSafeInteger(eligibleFromTick)
    ) {
      return;
    }
    this.pendingDashes += 1;
    this.markPlayerDirty(eligibleFromTick);
  }

  public recordBulletFired(eligibleFromTick: number): void {
    if (!Number.isSafeInteger(eligibleFromTick)) return;
    this.pendingShots += 1;
    this.markPlayerDirty(eligibleFromTick);
  }

  public recordLevel(level: number, eligibleFromTick: number): void {
    if (
      !Number.isSafeInteger(level) ||
      level < 1 ||
      !Number.isSafeInteger(eligibleFromTick)
    ) {
      return;
    }
    this.pendingLevel = level;
    this.markPlayerDirty(eligibleFromTick);
  }

  public recordWorldPressure(sample: DifficultyWorldPressure, tick: number): void {
    if (
      !Number.isSafeInteger(sample.activeEnemies) ||
      !Number.isSafeInteger(sample.maximumEnemies) ||
      !Number.isSafeInteger(sample.activeEncounters) ||
      sample.activeEnemies < 0 ||
      sample.maximumEnemies < 0 ||
      sample.activeEncounters < 0 ||
      !Number.isSafeInteger(tick)
    ) {
      return;
    }
    if (
      sample.activeEnemies === this.worldView.activeEnemies &&
      sample.maximumEnemies === this.worldView.maximumEnemies &&
      sample.activeEncounters === this.worldView.activeEncounters
    ) {
      return;
    }

    this.pendingActiveEnemies = sample.activeEnemies;
    this.pendingMaximumEnemies = sample.maximumEnemies;
    this.pendingActiveEncounters = sample.activeEncounters;
    this.worldDirty = true;
    this.worldEligibleTick = tick;
  }

  public requestReset(eligibleFromTick: number): void {
    if (Number.isSafeInteger(eligibleFromTick)) {
      this.resetEligibleTick = Math.min(this.resetEligibleTick, eligibleFromTick);
    }
  }

  public requestCycleContinue(eligibleFromTick: number): void {
    if (Number.isSafeInteger(eligibleFromTick)) {
      this.cycleResetEligibleTick = Math.min(
        this.cycleResetEligibleTick,
        eligibleFromTick
      );
    }
  }

  public drain(tick: number): DifficultyRuntimeInputView {
    if (this.resetEligibleTick <= tick) {
      this.reset();
      return this.view as DifficultyRuntimeInputView;
    }
    if (this.cycleResetEligibleTick <= tick) {
      this.resetForCycleContinue();
    }

    let runRevisionDirty = false;
    let playerRevisionDirty = false;
    if (this.hasPendingRun && this.runEligibleTick <= tick) {
      copyRunConstants(this.committedRunConstants, this.pendingRunConstants);
      this.hasCommittedRun = true;
      this.hasPendingRun = false;
      this.view.run.constants = this.committedRunConstants;
      runRevisionDirty = true;
      playerRevisionDirty = true;
      this.runEligibleTick = NO_ELIGIBLE_TICK;
    }
    if (this.greedDirty && this.greedEligibleTick <= tick) {
      this.view.run.greedLevel = this.pendingGreedLevel;
      this.greedDirty = false;
      this.greedEligibleTick = NO_ELIGIBLE_TICK;
      runRevisionDirty = true;
    }
    if (runRevisionDirty) {
      this.revisions.run += 1;
    }
    if (this.marketDirty && this.marketEligibleTick <= tick) {
      copyFrame(this.committedMarketFrame, this.pendingMarketFrame);
      this.view.market.frame = this.committedMarketFrame;
      this.revisions.market += 1;
      this.marketDirty = false;
      this.marketEligibleTick = NO_ELIGIBLE_TICK;
    }
    if (this.playerDirty && this.playerEligibleTick <= tick) {
      this.playerView.damageTaken = this.pendingDamageTaken;
      this.playerView.remainingHp = this.pendingRemainingHp;
      this.playerView.killsInWindow = this.pendingKills;
      this.playerView.dashesInWindow = this.pendingDashes;
      this.playerView.shotsInWindow = this.pendingShots;
      this.playerView.level = this.pendingLevel;
      this.clearPendingPlayerTelemetry();
      this.playerDirty = false;
      this.playerEligibleTick = NO_ELIGIBLE_TICK;
      playerRevisionDirty = true;
    }
    if (playerRevisionDirty) {
      this.revisions.player += 1;
    }
    if (this.worldDirty && this.worldEligibleTick <= tick) {
      this.worldView.activeEnemies = this.pendingActiveEnemies;
      this.worldView.maximumEnemies = this.pendingMaximumEnemies;
      this.worldView.activeEncounters = this.pendingActiveEncounters;
      this.revisions.world += 1;
      this.worldDirty = false;
      this.worldEligibleTick = NO_ELIGIBLE_TICK;
    }

    return this.view as DifficultyRuntimeInputView;
  }

  public reset(): void {
    this.revisions.market = 0;
    this.revisions.player = 0;
    this.revisions.run = 0;
    this.revisions.world = 0;
    this.lastAcceptedSourceSequence = -1;
    this.hasCommittedRun = false;
    this.hasPendingRun = false;
    this.marketDirty = false;
    this.playerDirty = false;
    this.worldDirty = false;
    this.marketEligibleTick = NO_ELIGIBLE_TICK;
    this.playerEligibleTick = NO_ELIGIBLE_TICK;
    this.runEligibleTick = NO_ELIGIBLE_TICK;
    this.greedEligibleTick = NO_ELIGIBLE_TICK;
    this.worldEligibleTick = NO_ELIGIBLE_TICK;
    this.resetEligibleTick = NO_ELIGIBLE_TICK;
    this.cycleResetEligibleTick = NO_ELIGIBLE_TICK;
    this.view.market.frame = null;
    this.view.run.constants = null;
    this.view.run.greedLevel = 0;
    this.pendingGreedLevel = 0;
    this.greedDirty = false;
    this.lastGreedCanonicalSequence = -1;
    this.lastGreedQuoteId = '';
    this.clearPlayerView();
    this.clearPendingPlayerTelemetry();
    this.clearWorldView();
  }

  public resetForCycleContinue(): void {
    this.playerDirty = false;
    this.worldDirty = false;
    this.playerEligibleTick = NO_ELIGIBLE_TICK;
    this.worldEligibleTick = NO_ELIGIBLE_TICK;
    this.cycleResetEligibleTick = NO_ELIGIBLE_TICK;
    this.clearPlayerView();
    this.clearPendingPlayerTelemetry();
    this.clearWorldView();
    this.revisions.player += 1;
    this.revisions.world += 1;
  }

  private markPlayerDirty(eligibleFromTick: number): void {
    this.playerDirty = true;
    this.playerEligibleTick = Math.min(this.playerEligibleTick, eligibleFromTick);
  }

  private clearPendingPlayerTelemetry(): void {
    this.pendingDamageTaken = 0;
    this.pendingRemainingHp = 0;
    this.pendingKills = 0;
    this.pendingDashes = 0;
    this.pendingShots = 0;
    this.pendingLevel = this.playerView.level;
  }

  private clearPlayerView(): void {
    this.playerView.damageTaken = 0;
    this.playerView.remainingHp = 0;
    this.playerView.killsInWindow = 0;
    this.playerView.dashesInWindow = 0;
    this.playerView.shotsInWindow = 0;
    this.playerView.level = 1;
  }

  private clearWorldView(): void {
    this.worldView.activeEnemies = 0;
    this.worldView.maximumEnemies = 0;
    this.worldView.activeEncounters = 0;
    this.pendingActiveEnemies = 0;
    this.pendingMaximumEnemies = 0;
    this.pendingActiveEncounters = 0;
  }
}
