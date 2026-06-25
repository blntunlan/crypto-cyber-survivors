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
import { GameMode, type CycleCompleteData } from '../types/gameMode';
import { CoinService } from '../services/gameplay/CoinService';
import { GameSessionService } from '../services/auth/GameSessionService';
import { DifficultyManager } from '../services/gameplay/DifficultyManager';
import { GameStateMachine } from '../services/core/GameStateMachine';
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

interface UseGameFlowControllerResult {
  upgradeChoices: Card[];
  cycleData: CycleCompleteData | null;
  pauseMenuStats: PauseMenuStats;
  frozenPnlRef: { current: number };
  handleLevelUp: () => void;
  selectUpgrade: (card: Card) => void;
  handleGameOver: (
    reason?: GameEndReason,
    rewardPayload?: RewardPayload
  ) => Promise<void>;
  handleCashOut: () => Promise<void>;
  handleContinue: () => void;
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
  const [cycleData, setCycleData] = useState<CycleCompleteData | null>(null);

  const isGameOverProcessingRef = useRef(false);
  const frozenPnlRef = useRef<number>(0);
  const liquidationGraceUntilRef = useRef<number>(0);

  const lastProcessedCycleRef = useRef<number>(0);

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
    liquidationGraceUntilRef.current = Date.now() + startOfRunLiquidationGraceMs;
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
      rewardPayload?: RewardPayload
    ) => {
      if (isGameOverProcessingRef.current) return;
      isGameOverProcessingRef.current = true;

      if (!GameStateMachine.transition(GameStatus.GAMEOVER)) {
        isGameOverProcessingRef.current = false;
        return;
      }

      frozenPnlRef.current = marketData.pnl;
      DifficultyManager.reset();

      // Challenge: end tracking synchronously BEFORE async session submission.
      // If onRunEnd runs after the await, a rapid retry can start a new run whose
      // tracking gets killed by this stale call. (race condition fix)
      ChallengeService.onRunEnd();

      const tracker = PerformanceTracker.getInstance();
      tracker.stop();
      const perfStats = tracker.getStats();

      const metrics = MetricsService.endSession(reason, {
        price: marketData.price,
        pnl: marketData.pnl,
        level: playerRef.current.level,
        hp: playerRef.current.hp,
        difficulty: marketData.difficulty,
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
                (rewardPayload?.survivalSeconds ??
                  DifficultyManager.getTotalElapsedSeconds()) * 1000,
              entryPrice,
              exitPrice: marketData.price,
              pnlPercent: marketData.pnl,
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
            await CoinService.creditVerifiedCoins(submission.reward, 'cycle_complete', {
              exitType: rewardPayload?.exitType,
              portalType: rewardPayload?.portalType,
              serverVerified: true,
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
        } catch (error) {
          Logger.error('[App] Critical error during session submission:', error);
        }
      })();
    },
    [
      marketData,
      playerRef,
      position,
      entryPrice,
      leverage,
      selectedPair,
      runStatsTotalKills,
    ]
  );

  useEffect(() => {
    if (gameStatus !== GameStatus.PLAYING) return;
    if (Date.now() < liquidationGraceUntilRef.current) return;

    if (marketData.effectivePnl <= -1) {
      Logger.warn(`[Liquidation] Player liquidated at price ${marketData.price}`);
      void handleGameOver(GameEndReason.LIQUIDATION);
    }
  }, [gameStatus, marketData.effectivePnl, marketData.price, handleGameOver]);

  useEffect(() => {
    AntiCheatService.updateCriticalValue('run_kills', runStatsTotalKills);
  }, [runStatsTotalKills]);

  useEffect(() => {
    const handleCycleComplete = (data: {
      cycleNumber: number;
      totalElapsedSeconds: number;
    }) => {
      Logger.debug(`[App] handleCycleComplete triggered. Mode=${gameMode}`, data);
      if (gameMode !== GameMode.COMPETITIVE) return;
      if (gameStatus !== GameStatus.PLAYING) return;
      if (data.cycleNumber <= lastProcessedCycleRef.current) return;
      if (!GameStateMachine.canTransition(GameStatus.CYCLE_COMPLETE)) return;

      const snapshot = cycleSnapshotRef.current;
      const previousProcessedCycle = lastProcessedCycleRef.current;
      lastProcessedCycleRef.current = data.cycleNumber;
      setCycleData({
        cycleNumber: data.cycleNumber,
        survivalTimeSeconds: data.totalElapsedSeconds,
        totalKills: snapshot.totalKills,
        level: playerRef.current.level,
        pnl: snapshot.pnl,
        effectivePnl: snapshot.effectivePnl,
        coinsEarned: 0,
        continueMultiplier: 1 + data.cycleNumber * 0.5,
      });

      if (!GameStateMachine.transition(GameStatus.CYCLE_COMPLETE)) {
        lastProcessedCycleRef.current = previousProcessedCycle;
        setCycleData(null);
      }
    };

    const unsubscribe = EventBus.on('cycleComplete', handleCycleComplete);
    return () => unsubscribe();
  }, [gameMode, gameStatus, playerRef]);

  const handleCashOut = useCallback(async () => {
    if (!cycleData) return;

    const maxStreak = ComboSystem.getMaxStreak();
    const rewards = CoinService.calculateCycleReward({
      survivalTimeSeconds: cycleData.survivalTimeSeconds,
      kills: cycleData.totalKills,
      level: cycleData.level,
      pnl: cycleData.effectivePnl,
      maxStreak,
    });

    const rewardPayload: RewardPayload = {
      kills: cycleData.totalKills,
      level: cycleData.level,
      survivalSeconds: cycleData.survivalTimeSeconds,
      pnlPercent: cycleData.effectivePnl,
      maxStreak,
      exitType: 'cycle_complete',
      portalType: null,
      rawCoins: rewards.killBonus,
      enemyDropCoins: 0,
      totalCoins: rewards.total,
      breakdown: {
        base: rewards.base,
        survival: rewards.base,
        kill: rewards.killBonus,
        level: rewards.levelBonus,
        market: rewards.marketBonus,
        streak: rewards.streakBonus,
        portal: rewards.portalBonus,
      },
    };

    DifficultyManager.reset();
    await handleGameOver(GameEndReason.CYCLE_COMPLETE, rewardPayload);
  }, [cycleData, handleGameOver]);

  const handleContinue = useCallback(() => {
    if (cycleData) {
      // Reset per-cycle state before applying new cycle factor to prevent compounding
      DifficultyManager.resetForCycleContinue();
      ComboSystem.resetCombo();
      // Apply difficulty multiplier for continuing (risk/reward)
      const cycleFactor = cycleData.continueMultiplier;
      difficultyContext.updateInputs({ cycleFactor });
      Logger.info(
        `[GameFlow] Continue: cycle ${cycleData.cycleNumber}, difficulty x${cycleFactor.toFixed(1)}`
      );

      // Heal player to full as reward for continuing
      healFull();
    }
    setCycleData(null);
    GameStateMachine.transition(GameStatus.PLAYING);
  }, [cycleData, healFull]);

  const resetFlowState = useCallback(() => {
    isGameOverProcessingRef.current = false;
    frozenPnlRef.current = 0;
    liquidationGraceUntilRef.current = 0;
    lastProcessedCycleRef.current = 0;
    setCycleData(null);
    setUpgradeChoices([]);
    DifficultyManager.reset();
  }, []);

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
    cycleData,
    pauseMenuStats,
    frozenPnlRef,
    handleLevelUp,
    selectUpgrade,
    handleGameOver,
    handleCashOut,
    handleContinue,
    markRunStarted,
    resetFlowState,
  };
};
