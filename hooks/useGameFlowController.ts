import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { type Card } from '../services/cards/types';
import { applyCardEffect } from '../services/cards/CardApplicator';
import { CardSystem } from '../services/cards/CardSystem';
import { audio } from '../services/audio';
import { EventBus } from '../services/core/EventBus';
import { GameEndReason } from '../types/metrics';
import { MetricsService } from '../services/core/MetricsService';
import {
  type LeverageOption,
  type MarketPosition,
  GameStatus,
  type Player,
  type MarketData,
} from '../types';
import {
  GameMode,
  type CashOutOfferData,
  type CycleCompleteData,
} from '../types/gameMode';
import { CoinService } from '../services/gameplay/CoinService';
import {
  GameSessionService,
  type CashOutDecision,
  type CashOutDecisionResponse,
} from '../services/auth/GameSessionService';
import { GameStateMachine } from '../services/core/GameStateMachine';
import { TimeService } from '../services/core/TimeService';
import { ExperienceService } from '../services/gameplay/ExperienceService';
import { PerformanceTracker } from '../services/analytics/PerformanceTracker';
import { DeviceProfiler } from '../services/analytics/DeviceProfiler';
import { ComboSystem } from '../services/combat/ComboSystem';
import { Logger } from '../services/system/Logger';
import { difficultyContext } from '../services/difficulty/DifficultyContext';
import { type CryptoPair } from '../types/crypto';
import { MetaProgressionService } from '../services/progression/MetaProgressionService';
import { ChallengeService } from '../services/challenges/ChallengeService';
import { ReplayRecorderService } from '../services/replay/ReplayRecorderService';
import { type RewardPayload } from '../types/reward';
import { AntiCheatService } from '../services/system/AntiCheatService';

interface UseGameFlowControllerParams {
  gameMode: GameMode;
  gameStatus: GameStatus;
  leverage: LeverageOption;
  marketData: MarketData;
  position: MarketPosition;
  entryPrice: number;
  selectedPair: CryptoPair;
  runStatsTotalKills: number;
  playerRef: { current: Player };
  setUiStats: Dispatch<SetStateAction<Player>>;
  healFull: () => void;
  startOfRunLiquidationGraceMs?: number;
}

export interface PauseMenuStats {
  totalKills: number;
  maxStreak: number;
  totalBonusXp: number;
}

export type RewardSettlement = {
  status: 'pending' | 'verified' | 'rejected';
  amount: number;
  message: string;
};

type EndRunOptions = {
  skipServerSubmission?: boolean;
};

interface UseGameFlowControllerResult {
  upgradeChoices: Card[];
  cashOutOffer: CashOutOfferData | null;
  pauseMenuStats: PauseMenuStats;
  frozenPnlRef: { current: number };
  gameOverReason: GameEndReason;
  rewardSettlement: RewardSettlement;
  handleLevelUp: () => void;
  selectUpgrade: (card: Card) => void;
  handleGameOver: (
    reason?: GameEndReason,
    rewardPayload?: RewardPayload
  ) => Promise<void>;
  handleCashOut: () => Promise<void>;
  handleRejectCashOut: () => Promise<void>;
  markRunStarted: () => void;
  resetFlowState: () => void;
}

export const useGameFlowController = ({
  gameMode,
  gameStatus,
  leverage,
  marketData,
  position,
  entryPrice,
  selectedPair,
  runStatsTotalKills,
  playerRef,
  setUiStats,
  healFull,
  startOfRunLiquidationGraceMs = 3_000,
}: UseGameFlowControllerParams): UseGameFlowControllerResult => {
  const [upgradeChoices, setUpgradeChoices] = useState<Card[]>([]);
  const [cashOutOffer, setCashOutOffer] = useState<CashOutOfferData | null>(null);
  const [gameOverReason, setGameOverReason] = useState<GameEndReason>(
    GameEndReason.DEATH
  );
  const [rewardSettlement, setRewardSettlement] = useState<RewardSettlement>({
    status: 'rejected',
    amount: 0,
    message: 'No reward has been settled for this run.',
  });
  const cashOutOfferRef = useRef<CashOutOfferData | null>(null);
  const cashOutDecisionInFlightRef = useRef(false);

  const isGameOverProcessingRef = useRef(false);
  const frozenPnlRef = useRef<number>(0);
  const liquidationGraceUntilGameSecondsRef = useRef<number>(0);

  const lastProcessedCycleRef = useRef<number>(0);

  const updateCashOutOffer = useCallback((offer: CashOutOfferData | null): void => {
    cashOutOfferRef.current = offer;
    setCashOutOffer(offer);
  }, []);

  const marketDataRef = useRef(marketData);
  useEffect(() => {
    marketDataRef.current = marketData;
  }, [marketData]);

  const cycleSnapshotRef = useRef({
    totalKills: runStatsTotalKills,
    pnl: marketData.pnl,
    effectivePnl: marketData.effectivePnl,
  });

  useEffect(() => {
    cycleSnapshotRef.current = {
      totalKills: runStatsTotalKills,
      pnl: marketData.pnl,
      effectivePnl: marketData.effectivePnl,
    };
  }, [runStatsTotalKills, marketData.pnl, marketData.effectivePnl]);

  const handleLevelUp = useCallback(() => {
    if (!GameStateMachine.transition(GameStatus.LEVEL_UP)) return;

    healFull();
    const choices = CardSystem.generateChoices(
      playerRef.current.luck,
      playerRef.current.level,
      MetaProgressionService.getCardChoiceCount()
    );
    setUpgradeChoices(choices);
    audio.playLevelUp();
  }, [healFull, playerRef]);
  const markRunStarted = useCallback(() => {
    liquidationGraceUntilGameSecondsRef.current =
      TimeService.getGameTimeSeconds() + startOfRunLiquidationGraceMs / 1000;
    AntiCheatService.registerCriticalValue('player_level', playerRef.current.level);
    AntiCheatService.registerCriticalValue('player_exp', playerRef.current.exp);
    AntiCheatService.registerCriticalValue('run_kills', runStatsTotalKills);
  }, [startOfRunLiquidationGraceMs, playerRef, runStatsTotalKills]);

  const selectUpgrade = useCallback(
    (card: Card) => {
      const player = playerRef.current;
      const nextPlayer = applyCardEffect(player, card);

      const safeExp = Number.isNaN(nextPlayer.exp) ? 0 : nextPlayer.exp;
      const safeNextLevelExp = Number.isNaN(nextPlayer.nextLevelExp)
        ? 100
        : nextPlayer.nextLevelExp;

      nextPlayer.level += 1;
      nextPlayer.exp = Math.max(0, safeExp - safeNextLevelExp);
      nextPlayer.nextLevelExp = ExperienceService.getRequiredExp(
        nextPlayer.level,
        leverage
      );

      AntiCheatService.updateCriticalValue('player_level', nextPlayer.level);
      AntiCheatService.updateCriticalValue('player_exp', nextPlayer.exp);

      MetricsService.trackLevelUp(nextPlayer.level, card.name, card.tier);
      playerRef.current = nextPlayer;
      setUiStats({ ...nextPlayer });
      EventBus.emit('levelUpComplete', { newLevel: nextPlayer.level });
      EventBus.emit('levelUp', { level: nextPlayer.level });

      if (nextPlayer.exp >= nextPlayer.nextLevelExp) {
        handleLevelUp();
      } else {
        GameStateMachine.transition(GameStatus.PLAYING);
      }
    },
    [playerRef, setUiStats, handleLevelUp, leverage]
  );

  const handleGameOver = useCallback(
    async (
      reason: GameEndReason = GameEndReason.DEATH,
      rewardPayload?: RewardPayload,
      options: EndRunOptions = {}
    ) => {
      if (isGameOverProcessingRef.current) return;
      isGameOverProcessingRef.current = true;

      setGameOverReason(reason);
      if (
        reason === GameEndReason.DEATH ||
        reason === GameEndReason.LIQUIDATION ||
        reason === GameEndReason.DISCONNECT ||
        reason === GameEndReason.QUIT
      ) {
        setRewardSettlement({
          status: 'rejected',
          amount: 0,
          message:
            reason === GameEndReason.LIQUIDATION
              ? 'No coins credited — the position reached its liquidation price.'
              : reason === GameEndReason.DEATH
                ? 'No coins credited — the run ended by HP elimination.'
                : 'No coins credited — the run ended before server settlement.',
        });
      } else if (!options.skipServerSubmission) {
        setRewardSettlement({
          status: 'pending',
          amount: 0,
          message: 'Waiting for authoritative server verification…',
        });
      }

      if (!GameStateMachine.transition(GameStatus.GAMEOVER)) {
        isGameOverProcessingRef.current = false;
        return;
      }

      frozenPnlRef.current = marketDataRef.current.pnl;
      const survivalSeconds = TimeService.getGameTimeSeconds();
      EventBus.emit('gameOver', {
        finalLevel: playerRef.current.level,
        finalPnl: frozenPnlRef.current,
      });
      difficultyContext.reset();

      // Challenge: end tracking synchronously BEFORE async session submission.
      // If onRunEnd runs after the await, a rapid retry can start a new run whose
      // tracking gets killed by this stale call. (race condition fix)
      ChallengeService.onRunEnd();

      if (options.skipServerSubmission) return;

      if (reason === GameEndReason.DEATH || reason === GameEndReason.LIQUIDATION) {
        const failureType =
          reason === GameEndReason.LIQUIDATION ? 'liquidation' : 'death';
        const endingSessionId = GameSessionService.getCurrentSessionId();
        void GameSessionService.recordCashOutFailure(
          failureType,
          `failure:${failureType}:${survivalSeconds}`
        )
          .catch(error => {
            Logger.error('[GameFlow] Authoritative failure settlement failed', error);
          })
          .finally(() => {
            if (endingSessionId !== null) {
              GameSessionService.clearSession(endingSessionId);
            }
            isGameOverProcessingRef.current = false;
          });
        return;
      }

      const tracker = PerformanceTracker.getInstance();
      tracker.stop();
      const perfStats = tracker.getStats();

      const md = marketDataRef.current;
      const metrics = MetricsService.endSession(reason, {
        price: md.price,
        pnl: md.pnl,
        level: playerRef.current.level,
        hp: playerRef.current.hp,
        difficulty: md.difficulty,
        playerStats: {
          damage: playerRef.current.baseDamage,
          fireRate: playerRef.current.fireRate,
          speed: playerRef.current.speed,
          luck: playerRef.current.luck,
          critChance: playerRef.current.critChance,
          critDamage: playerRef.current.critChance * 2,
        },
        position,
        entryPrice,
        leverage,
        totalKills: runStatsTotalKills,
        avgFps: perfStats.avgFps,
        minFps: perfStats.minFps,
        maxFps: perfStats.maxFps,
        fps_1_percentile: perfStats.onePercentLow,
        avg_frame_time_ms: perfStats.avgFrameTime,
        max_frame_time_ms: perfStats.maxFrameTime,
        fpsSamples: perfStats.sampleCount,
        deviceFingerprint: DeviceProfiler.getFingerprint(),
        browser: DeviceProfiler.getProfile().userAgent.substring(0, 64),
        os: 'Windows',
        pixelRatio: window.devicePixelRatio,
      });

      if (!metrics) {
        Logger.warn(
          '[GameFlow] Metrics unavailable during game over; skipping session submission'
        );
        isGameOverProcessingRef.current = false;
        return;
      }

      void (async () => {
        try {
          const maxStreak = rewardPayload?.maxStreak ?? ComboSystem.getMaxStreak();
          const submission = await GameSessionService.submitSession(
            {
              level: rewardPayload?.level ?? playerRef.current.level,
              kills: rewardPayload?.kills ?? runStatsTotalKills,
              survivalTimeMs:
                (rewardPayload?.survivalSeconds ?? survivalSeconds) * 1000,
              entryPrice,
              exitPrice: md.price,
              pnlPercent: md.pnl,
              pair: selectedPair,
              position,
              leverage,
              endReason: reason,
              exitType:
                rewardPayload?.exitType ??
                (reason === GameEndReason.PORTAL
                  ? 'portal'
                  : reason === GameEndReason.CYCLE_COMPLETE
                    ? 'cycle_complete'
                    : 'death'),
              portalType: rewardPayload?.portalType ?? null,
              maxStreak,
              replayData: metrics.replayData,
              performance: metrics.performance,
            },
            rewardPayload
          );

          if (
            submission.success &&
            submission.verified === true &&
            submission.reward &&
            submission.reward > 0
          ) {
            Logger.info(`[App] Session verified! Reward: ${submission.reward}`);
            const credited = await CoinService.creditVerifiedCoins(
              submission.reward,
              'cycle_complete',
              {
                exitType: rewardPayload?.exitType,
                portalType: rewardPayload?.portalType,
                serverVerified: true,
              }
            );
            setRewardSettlement(
              credited
                ? {
                    status: 'verified',
                    amount: submission.reward,
                    message: 'Reward verified and credited to your Hub balance.',
                  }
                : {
                    status: 'rejected',
                    amount: 0,
                    message: 'The verified reward could not be credited. Please retry.',
                  }
            );
          } else {
            setRewardSettlement({
              status: 'rejected',
              amount: 0,
              message:
                'Server verification did not approve a coin reward for this run.',
            });
          }

          // Meta Progression: transfer 15% of coins
          const metaShare = submission.metaShare ?? 0;
          if (metaShare > 0) {
            MetaProgressionService.applyVerifiedTransfer(metaShare);
          }

          // Replay: save recording only after authoritative verification succeeds.
          if (submission.success && submission.verified === true) {
            void ReplayRecorderService.saveReplay(submission.reward ?? 0);
          }

          // Achievements: emit UI events for server-unlocked achievements.
          if (
            submission.success &&
            submission.verified === true &&
            submission.newlyUnlockedAchievements?.length
          ) {
            for (const ach of submission.newlyUnlockedAchievements) {
              EventBus.emit('milestoneAchieved', {
                id: ach.achievementId,
                name: ach.name,
                icon: ach.iconKey,
                color: '#ffd700',
                type: 'achievement',
                threshold: 0,
              });
            }
          }
        } catch (error) {
          setRewardSettlement({
            status: 'rejected',
            amount: 0,
            message: 'Reward verification failed. No coins were credited.',
          });
          Logger.error('[App] Critical error during session submission:', error);
        }
      })();
    },
    [playerRef, position, entryPrice, leverage, selectedPair, runStatsTotalKills]
  );

  useEffect(() => {
    if (gameStatus !== GameStatus.PLAYING) return;
    if (
      TimeService.getGameTimeSeconds() < liquidationGraceUntilGameSecondsRef.current
    ) {
      return;
    }

    if (marketData.effectivePnl <= -1) {
      Logger.warn(`[Liquidation] Player liquidated at price ${marketData.price}`);
      void handleGameOver(GameEndReason.LIQUIDATION);
    }
  }, [gameStatus, marketData.effectivePnl, marketData.price, handleGameOver]);

  useEffect(() => {
    AntiCheatService.updateCriticalValue('run_kills', runStatsTotalKills);
  }, [runStatsTotalKills]);

  useEffect(() => {
    const handleCycleComplete = async (data: {
      cycleNumber: number;
      totalElapsedSeconds: number;
    }): Promise<void> => {
      Logger.debug(`[App] handleCycleComplete triggered. Mode=${gameMode}`, data);
      if (gameMode !== GameMode.COMPETITIVE) return;
      if (gameStatus !== GameStatus.PLAYING) return;
      if (data.cycleNumber <= lastProcessedCycleRef.current) return;

      const snapshot = cycleSnapshotRef.current;
      const previousProcessedCycle = lastProcessedCycleRef.current;
      lastProcessedCycleRef.current = data.cycleNumber;
      const cycle: CycleCompleteData = {
        cycleNumber: data.cycleNumber,
        survivalTimeSeconds: data.totalElapsedSeconds,
        totalKills: snapshot.totalKills,
        level: playerRef.current.level,
        pnl: snapshot.pnl,
        effectivePnl: snapshot.effectivePnl,
      };

      try {
        const response = await GameSessionService.requestCashOutQuote();
        updateCashOutOffer({
          cycle,
          quote: response.quote,
          signature: response.signature,
          safeExitOnly: response.safeExitOnly,
          greedLevel: response.greedLevel,
        });
        EventBus.emit('cashOutOfferOpened', { cycleNumber: data.cycleNumber });
      } catch (error) {
        lastProcessedCycleRef.current = previousProcessedCycle;
        EventBus.emit('cashOutOfferQuoteFailed', { cycleNumber: data.cycleNumber });
        Logger.error('[GameFlow] Authoritative cash-out quote failed', error);
      }
    };

    const unsubscribe = EventBus.on('cycleComplete', data => {
      void handleCycleComplete(data);
    });
    return () => unsubscribe();
  }, [gameMode, gameStatus, playerRef, updateCashOutOffer]);

  const settleCashOutDecision = useCallback(
    async (decision: CashOutDecision): Promise<CashOutDecisionResponse | null> => {
      const offer = cashOutOfferRef.current;
      if (offer === null || cashOutDecisionInFlightRef.current) return null;

      cashOutDecisionInFlightRef.current = true;
      try {
        const settlement = await GameSessionService.decideCashOut(
          offer.quote.quoteId,
          offer.signature,
          decision,
          `${decision}:${offer.quote.quoteId}`
        );
        EventBus.emit('cashOutDecisionCommitted', {
          sessionId: offer.quote.sessionId,
          quoteId: offer.quote.quoteId,
          canonicalSequence: settlement.canonicalSequence,
          decision,
          greedLevel: settlement.greedLevel,
        });
        return settlement;
      } catch (error) {
        Logger.error('[GameFlow] Authoritative cash-out decision failed', error);
        return null;
      } finally {
        cashOutDecisionInFlightRef.current = false;
      }
    },
    []
  );

  const handleCashOut = useCallback(async () => {
    const offer = cashOutOfferRef.current;
    if (offer === null) return;
    const settlement = await settleCashOutDecision(
      offer.safeExitOnly ? 'safe_exit' : 'accept'
    );
    if (settlement?.state !== 'settled') return;

    EventBus.emit('cycleDecisionMade', {
      decision: 'CASH_OUT',
      cycleNumber: offer.cycle.cycleNumber,
    });
    updateCashOutOffer(null);
    GameSessionService.clearSession();
    difficultyContext.reset();
    setRewardSettlement({
      status: 'verified',
      amount: settlement.rewardPoints,
      message: 'Cash-out reward verified and credited to your Hub balance.',
    });
    await handleGameOver(GameEndReason.CYCLE_COMPLETE, undefined, {
      skipServerSubmission: true,
    });
  }, [handleGameOver, settleCashOutDecision, updateCashOutOffer]);

  const handleRejectCashOut = useCallback(async () => {
    const settlement = await settleCashOutDecision('reject');
    if (settlement?.state === 'active') {
      updateCashOutOffer(null);
    }
  }, [settleCashOutDecision, updateCashOutOffer]);

  useEffect(() => {
    if (cashOutOffer === null) return;
    const delayMs = Math.max(
      0,
      cashOutOffer.quote.expiresAtSeconds * 1_000 - Date.now()
    );
    const timerId = window.setTimeout(() => {
      void settleCashOutDecision('timeout').then(settlement => {
        if (settlement?.state === 'active') {
          updateCashOutOffer(null);
        }
      });
    }, delayMs);
    return () => window.clearTimeout(timerId);
  }, [cashOutOffer, settleCashOutDecision, updateCashOutOffer]);

  const resetFlowState = useCallback(() => {
    isGameOverProcessingRef.current = false;
    frozenPnlRef.current = 0;
    liquidationGraceUntilGameSecondsRef.current = 0;
    lastProcessedCycleRef.current = 0;
    updateCashOutOffer(null);
    setUpgradeChoices([]);
    setGameOverReason(GameEndReason.DEATH);
    setRewardSettlement({
      status: 'rejected',
      amount: 0,
      message: 'No reward has been settled for this run.',
    });
    difficultyContext.reset();
  }, [updateCashOutOffer]);

  const pauseMenuStats = useMemo<PauseMenuStats>(
    () => ({
      totalKills: runStatsTotalKills,
      maxStreak: ComboSystem.getMaxStreak(),
      totalBonusXp: 0,
    }),
    [runStatsTotalKills]
  );

  return {
    upgradeChoices,
    cashOutOffer,
    pauseMenuStats,
    frozenPnlRef,
    gameOverReason,
    rewardSettlement,
    handleLevelUp,
    selectUpgrade,
    handleGameOver,
    handleCashOut,
    handleRejectCashOut,
    markRunStarted,
    resetFlowState,
  };
};
