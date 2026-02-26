import { useState, useEffect, useRef } from 'react';
import {
  MarketPosition,
  type MarketData,
  GameStatus,
  type Player,
  type LeverageOption,
} from '../types';
import {
  MarketService,
  type MarketUpdate,
  type ConnectionStatus,
} from '../services/market/MarketService';
import { MarketCalculator, type ATRContext } from '../services/market/MarketCalculator';
import { DifficultyManager } from '../services/gameplay/DifficultyManager';
import { MAX_CHART_POINTS, MARKET } from '../constants';
import { type CryptoPair } from '../types/crypto';
import { EventBus } from '../services/core/EventBus';
import { Logger } from '../services/system/Logger';
import { priceAnalyzer } from '../services/admin/PriceAnalyzerService';
import { type MarketStateData } from '../types/events';
import { type MarketRuntimeMode } from '../config/marketRuntime';
import {
  MARKET_RUNTIME_VERSION,
  type MarketRunConstants,
  type MarketRuntimeSnapshot,
  type MarketRuntimeTick,
} from '../types/marketRuntime';
import {
  createRunConstants,
  createRuntimeFeedHealth,
  createRuntimeRunId,
  createRuntimeTick,
  toRuntimePosition,
} from '../services/market/runtime/RuntimeContractBuilder';
import {
  computeRuntimeSnapshot,
  createInitialMarketComputeState,
  type MarketComputeState,
} from '../services/market/runtime/MarketCompute';
import { MarketRuntimeController } from '../services/market/runtime/MarketRuntimeController';
import { getMarketSyncQueue } from '../services/market/sync';

// ATR_PERIOD is now managed by MarketCalculator

// Market data timeout configuration
// CRITICAL: 10 seconds = fatal disconnect (game ends)
// Under 10 seconds = game continues with fallback data
const MARKET_DATA_TIMEOUT_MS = 10_000; // 10 seconds without data = timeout
const TIMEOUT_CHECK_INTERVAL_MS = 1_000; // Check every 1 second for responsive detection
const RUNTIME_TELEMETRY_LOG_INTERVAL_MS = 5_000;
const MAX_RUNTIME_PENDING_TICKS = 256;

interface RuntimePendingTickEntry {
  tick: MarketRuntimeTick;
  runConstants: MarketRunConstants;
  sourceUpdate: MarketUpdate;
  provisionalMarketData: MarketData;
}

const toMarketPosition = (position: MarketRunConstants['position']): MarketPosition => {
  return position === 'SHORT' ? MarketPosition.SHORT : MarketPosition.LONG;
};

const createRuntimeMarketData = (
  base: MarketData,
  runConstants: MarketRunConstants,
  snapshot: MarketRuntimeSnapshot
): MarketData => {
  return {
    ...base,
    price: snapshot.price,
    volume: snapshot.volume,
    pnl: snapshot.rawPnl,
    effectivePnl: snapshot.effectivePnl,
    leverage: runConstants.leverage as LeverageOption,
    position: toMarketPosition(runConstants.position),
    liquidationPrice: runConstants.liquidationPrice,
    rsi: snapshot.rsi,
    difficulty: snapshot.difficulty,
    pair: runConstants.pair,
    symbol: `${runConstants.pair}USDT`,
    momentum: snapshot.momentum,
    atrPercent: snapshot.atrPercent,
    spawnRateMultiplier: snapshot.spawnRateMultiplier,
    enemyDamage: snapshot.enemyDamage,
    enemySpeed: snapshot.enemySpeed,
    gemValueMultiplier: snapshot.gemValueMultiplier,
    runtimeRunId: snapshot.runId,
    runtimeSeq: snapshot.seq,
    runtimeChecksum: snapshot.checksum,
    runtimeTickHash: snapshot.tickHash,
    algoVersion: snapshot.algoVersion,
    configVersion: snapshot.configVersion,
  };
};

export const useMarketData = (
  gameStatus: GameStatus,
  position: MarketPosition,
  entryPrice: number,
  leverage: LeverageOption,
  playerRef: React.RefObject<Player>,
  pair: CryptoPair = 'BTC',
  marketRuntimeMode: MarketRuntimeMode = 'legacy'
) => {
  const [marketData, setMarketData] = useState<MarketData>({
    price: entryPrice || MARKET.FALLBACK_PRICES[pair],
    volume: 0,
    pnl: 0,
    effectivePnl: 0,
    leverage: 1,
    rsi: 50,
    difficulty: 1,
    pair: 'BTC',
    symbol: 'BTCUSDT',
    momentum: 0,
  });

  const [_priceHistory, setPriceHistory] = useState<number[]>([]);
  // ATR calculation context (managed by MarketCalculator)
  const atrContextRef = useRef<ATRContext>({ trHistory: [], prevClose: null });

  // Timeout tracking
  const lastPriceTimeRef = useRef<number>(Date.now());
  const timeoutTriggeredRef = useRef<boolean>(false);

  // Use refs for inputs to avoid stale closures in market service callback
  const gameStatusRef = useRef(gameStatus);
  const positionRef = useRef(position);
  const entryPriceRef = useRef(entryPrice);
  const leverageRef = useRef(leverage);
  const pairRef = useRef(pair);
  const runtimeModeRef = useRef<MarketRuntimeMode>(marketRuntimeMode);
  const runtimeFallbackWarnedRef = useRef(false);
  const lastRuntimeTelemetryAtRef = useRef(0);
  const lastRuntimeFeedHealthLogAtRef = useRef(0);
  const runtimeSeqRef = useRef(0);
  const runtimeHashRef = useRef('seed0000');
  const runtimeRunConstantsRef = useRef<MarketRunConstants | null>(null);
  const runtimeComputeStateRef = useRef<MarketComputeState>(
    createInitialMarketComputeState()
  );
  const runtimePreviousSnapshotRef = useRef<MarketRuntimeSnapshot | null>(null);
  const runtimeWorkerSnapshotRef = useRef<MarketRuntimeSnapshot | null>(null);
  const runtimePendingTickEntriesRef = useRef<Map<number, RuntimePendingTickEntry>>(
    new Map()
  );
  const runtimeControllerRef = useRef<MarketRuntimeController | null>(null);
  const runtimeControllerRunIdRef = useRef<string | null>(null);
  const lastRuntimeWorkerTelemetryAtRef = useRef(0);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
    positionRef.current = position;
    entryPriceRef.current = entryPrice;
    leverageRef.current = leverage;
    pairRef.current = pair;
  }, [gameStatus, position, entryPrice, leverage, pair]);

  useEffect(() => {
    runtimeModeRef.current = marketRuntimeMode;
    runtimeFallbackWarnedRef.current = false;
    lastRuntimeTelemetryAtRef.current = 0;
    lastRuntimeFeedHealthLogAtRef.current = 0;
    lastRuntimeWorkerTelemetryAtRef.current = 0;

    if (marketRuntimeMode === 'legacy') {
      runtimeControllerRef.current?.dispose();
      runtimeControllerRef.current = null;
      runtimeControllerRunIdRef.current = null;
      runtimeWorkerSnapshotRef.current = null;
      runtimePendingTickEntriesRef.current.clear();
    }
  }, [marketRuntimeMode]);

  // Reset timeout timer when resuming game to prevent immediate disconnects from background time
  useEffect(() => {
    // Defensive check: GameStatus might be undefined during hot reload or circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (gameStatus === GameStatus?.PLAYING) {
      lastPriceTimeRef.current = Date.now();
      timeoutTriggeredRef.current = false;
    }
  }, [gameStatus]);

  useEffect(() => {
    if (
      gameStatus === GameStatus.MENU ||
      gameStatus === GameStatus.GAMEOVER ||
      gameStatus === GameStatus.CYCLE_COMPLETE
    ) {
      runtimeRunConstantsRef.current = null;
      runtimeSeqRef.current = 0;
      runtimeHashRef.current = 'seed0000';
      runtimeComputeStateRef.current = createInitialMarketComputeState();
      runtimePreviousSnapshotRef.current = null;
      runtimeWorkerSnapshotRef.current = null;
      runtimePendingTickEntriesRef.current.clear();
      runtimeControllerRunIdRef.current = null;
    }
  }, [gameStatus]);

  // Market data timeout checker
  useEffect(() => {
    const checkTimeout = () => {
      const currentStatus = gameStatusRef.current;

      // Only check during active gameplay
      if (currentStatus !== GameStatus.PLAYING) {
        timeoutTriggeredRef.current = false; // Reset flag when not playing
        return;
      }

      const timeSinceLastPrice = Date.now() - lastPriceTimeRef.current;

      if (timeSinceLastPrice > MARKET_DATA_TIMEOUT_MS && !timeoutTriggeredRef.current) {
        timeoutTriggeredRef.current = true;

        Logger.error(
          `[Market] Data timeout - no price updates for ${timeSinceLastPrice}ms`
        );

        // Emit timeout event for game to handle
        EventBus.emit('marketDataTimeout', {
          lastPriceTime: lastPriceTimeRef.current,
          disconnectedDuration: timeSinceLastPrice,
          pair: pairRef.current,
        });
      }
    };

    const intervalId = setInterval(checkTimeout, TIMEOUT_CHECK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  // Sync with MarketStateService for indicators (RSI, Volume, ATR, etc.)
  useEffect(() => {
    const handleMarketStateUpdate = (state: MarketStateData) => {
      if (state.pair === pairRef.current) {
        setMarketData(prev => ({
          ...prev,
          rsi: state.rsi,
          rsiState: state.rsiState,
          whaleTier: state.whaleTier,
          spawnRateMultiplier: state.spawnRateMultiplier,
          atrPercent: state.atrPercent, // Server ATR for difficulty calculation
        }));
      }
    };

    const unsub = EventBus.on('marketStateUpdated', handleMarketStateUpdate);
    return () => {
      unsub();
    };
  }, [pair]);

  // Session Reset & Cleanup (CRITICAL for pair switching)
  useEffect(() => {
    setPriceHistory([]);
    atrContextRef.current = { trHistory: [], prevClose: null };
    lastPriceTimeRef.current = Date.now(); // Reset timeout on pair switch
    timeoutTriggeredRef.current = false;
    runtimeRunConstantsRef.current = null;
    runtimeSeqRef.current = 0;
    runtimeHashRef.current = 'seed0000';
    runtimeComputeStateRef.current = createInitialMarketComputeState();
    runtimePreviousSnapshotRef.current = null;
    runtimeWorkerSnapshotRef.current = null;
    runtimePendingTickEntriesRef.current.clear();
    runtimeControllerRunIdRef.current = null;

    setMarketData(prev => ({
      ...prev,
      price: entryPriceRef.current || MARKET.FALLBACK_PRICES[pair],
      difficulty: 1,
      pnl: 0,
      effectivePnl: 0,
      pair,
    }));
  }, [pair]);

  useEffect(() => {
    // CRITICAL: Flag to prevent stale callbacks from old MarketService instances
    let isCancelled = false;

    // Capture the pair at the time of service creation to prevent race conditions
    const expectedPair = pair;

    const maybeLogRuntimeTelemetry = (
      mode: MarketRuntimeMode,
      update: MarketUpdate,
      snapshot: MarketData
    ) => {
      if (mode === 'legacy') return;

      const now = Date.now();
      if (now - lastRuntimeTelemetryAtRef.current < RUNTIME_TELEMETRY_LOG_INTERVAL_MS) {
        return;
      }

      lastRuntimeTelemetryAtRef.current = now;
      Logger.info('[MarketRuntime] Shadow snapshot', {
        mode,
        pair: update.pair,
        source: update.source,
        price: Number(snapshot.price.toFixed(2)),
        pnl: Number(snapshot.pnl.toFixed(4)),
        effectivePnl: Number(snapshot.effectivePnl.toFixed(4)),
        difficulty: Number(snapshot.difficulty.toFixed(4)),
      });
    };

    const maybeLogRuntimeFeedHealth = (
      mode: MarketRuntimeMode,
      status: ConnectionStatus
    ) => {
      if (mode === 'legacy') return;

      const now = Date.now();
      if (
        now - lastRuntimeFeedHealthLogAtRef.current <
        RUNTIME_TELEMETRY_LOG_INTERVAL_MS
      ) {
        return;
      }

      lastRuntimeFeedHealthLogAtRef.current = now;
      Logger.info('[MarketRuntime] Feed health', {
        mode,
        pair: expectedPair,
        binance: status.binance,
        coinbase: status.coinbase,
        totalDisconnectDuration: status.totalDisconnectDuration,
        isUsingFallbackData: status.isUsingFallbackData,
      });
    };

    const maybeLogWorkerDrift = (
      localSnapshot: MarketRuntimeSnapshot,
      workerSnapshot: MarketRuntimeSnapshot
    ) => {
      const mode = runtimeModeRef.current;
      if (mode === 'legacy') return;

      const now = Date.now();
      if (
        now - lastRuntimeWorkerTelemetryAtRef.current <
        RUNTIME_TELEMETRY_LOG_INTERVAL_MS
      ) {
        return;
      }

      const rawPnlDelta = Number(
        (workerSnapshot.rawPnl - localSnapshot.rawPnl).toFixed(8)
      );
      const effectivePnlDelta = Number(
        (workerSnapshot.effectivePnl - localSnapshot.effectivePnl).toFixed(8)
      );
      const difficultyDelta = Number(
        (workerSnapshot.difficulty - localSnapshot.difficulty).toFixed(8)
      );

      lastRuntimeWorkerTelemetryAtRef.current = now;
      Logger.info('[MarketRuntime] Worker drift', {
        mode,
        runId: localSnapshot.runId,
        seq: localSnapshot.seq,
        rawPnlDelta,
        effectivePnlDelta,
        difficultyDelta,
      });
    };

    const emitRuntimeArtifacts = (
      runConstants: MarketRunConstants,
      tick: MarketRuntimeTick,
      runtimeSnapshot: MarketRuntimeSnapshot,
      marketSnapshot: MarketData,
      sourceUpdate: MarketUpdate
    ) => {
      EventBus.emit('marketRuntimeTick', tick);
      EventBus.emit('marketRuntimeSnapshot', runtimeSnapshot);
      EventBus.emit('marketRuntimeUpdate', {
        runConstants,
        tick,
        snapshot: runtimeSnapshot,
      });
      EventBus.emit('marketUpdate', {
        price: marketSnapshot.price,
        pnlPercent: marketSnapshot.pnl,
        runId: runtimeSnapshot.runId,
        seq: runtimeSnapshot.seq,
        tick,
        snapshot: runtimeSnapshot,
        algoVersion: runtimeSnapshot.algoVersion,
        configVersion: runtimeSnapshot.configVersion,
      });

      void getMarketSyncQueue()
        .enqueue({
          runConstants,
          tick,
          snapshot: runtimeSnapshot,
        })
        .catch(error => {
          Logger.warn('[MarketSyncQueue] enqueue failed', {
            error: error instanceof Error ? error.message : String(error),
          });
        });

      maybeLogRuntimeTelemetry(runtimeModeRef.current, sourceUpdate, marketSnapshot);
      EventBus.emit('gameMarketUpdate', marketSnapshot);
    };

    const rememberPendingRuntimeTick = (entry: RuntimePendingTickEntry) => {
      const pending = runtimePendingTickEntriesRef.current;
      pending.set(entry.tick.seq, entry);

      if (pending.size <= MAX_RUNTIME_PENDING_TICKS) return;

      const seqs = [...pending.keys()].sort((a, b) => a - b);
      const excessCount = pending.size - MAX_RUNTIME_PENDING_TICKS;
      for (let i = 0; i < excessCount; i += 1) {
        const seq = seqs[i];
        if (seq !== undefined) {
          pending.delete(seq);
        }
      }
    };

    const clearPendingRuntimeTick = (seq: number) => {
      const pending = runtimePendingTickEntriesRef.current;
      pending.delete(seq);

      for (const key of pending.keys()) {
        if (key <= seq - 16) {
          pending.delete(key);
        }
      }
    };

    const ensureRuntimeController = (): MarketRuntimeController | null => {
      if (runtimeModeRef.current === 'legacy') return null;
      if (typeof Worker === 'undefined') return null;

      if (runtimeControllerRef.current) {
        return runtimeControllerRef.current;
      }

      runtimeControllerRef.current = new MarketRuntimeController({
        onSnapshot: snapshot => {
          runtimeWorkerSnapshotRef.current = snapshot;

          const localSnapshot = runtimePreviousSnapshotRef.current;
          if (
            localSnapshot?.runId === snapshot.runId &&
            localSnapshot.seq === snapshot.seq
          ) {
            maybeLogWorkerDrift(localSnapshot, snapshot);
          }

          if (runtimeModeRef.current !== 'runtime') {
            return;
          }

          const pending = runtimePendingTickEntriesRef.current.get(snapshot.seq);
          if (pending?.runConstants.runId !== snapshot.runId) {
            return;
          }

          clearPendingRuntimeTick(snapshot.seq);

          const authoritativeMarketData = createRuntimeMarketData(
            pending.provisionalMarketData,
            pending.runConstants,
            snapshot
          );

          setMarketData(prev => {
            if (
              prev.runtimeRunId === snapshot.runId &&
              typeof prev.runtimeSeq === 'number' &&
              prev.runtimeSeq > snapshot.seq
            ) {
              return prev;
            }

            return createRuntimeMarketData(prev, pending.runConstants, snapshot);
          });

          emitRuntimeArtifacts(
            pending.runConstants,
            pending.tick,
            snapshot,
            authoritativeMarketData,
            pending.sourceUpdate
          );
        },
        onError: message => {
          Logger.warn('[MarketRuntime] Worker controller error', { message });
        },
      });

      return runtimeControllerRef.current;
    };

    const getOrCreateRunConstants = (
      currentStatus: GameStatus,
      currentEntryPrice: number,
      currentPosition: MarketPosition,
      currentLeverage: LeverageOption,
      liquidationPrice: number
    ): MarketRunConstants | null => {
      if (runtimeRunConstantsRef.current) {
        return runtimeRunConstantsRef.current;
      }

      if (currentStatus !== GameStatus.PLAYING || currentEntryPrice <= 0) {
        return null;
      }

      const runId = createRuntimeRunId(
        expectedPair,
        Date.now(),
        Math.random().toString(36).slice(2, 8)
      );

      const runConstants = createRunConstants({
        runId,
        pair: expectedPair,
        position: toRuntimePosition(currentPosition),
        leverage: currentLeverage,
        entryPrice: currentEntryPrice,
        liquidationPrice,
        startedAt: Date.now(),
        versions: MARKET_RUNTIME_VERSION,
      });

      runtimeRunConstantsRef.current = runConstants;
      runtimeSeqRef.current = 0;
      runtimeHashRef.current = 'seed0000';
      runtimeComputeStateRef.current = createInitialMarketComputeState();
      runtimePreviousSnapshotRef.current = null;
      runtimeWorkerSnapshotRef.current = null;
      runtimePendingTickEntriesRef.current.clear();
      runtimeControllerRunIdRef.current = null;

      Logger.info('[MarketRuntime] Run constants locked', {
        runId: runConstants.runId,
        pair: runConstants.pair,
        position: runConstants.position,
        leverage: runConstants.leverage,
        entryPrice: runConstants.entryPrice,
        liquidationPrice: runConstants.liquidationPrice,
        mode: runtimeModeRef.current,
      });

      const runtimeController = ensureRuntimeController();
      if (runtimeController) {
        runtimeController.start(runConstants);
        runtimeControllerRunIdRef.current = runConstants.runId;
      }

      return runConstants;
    };

    Logger.info(`[useMarketData] Creating MarketService for ${expectedPair}`);

    const service = new MarketService({
      pair,
      onStatusChange: status => {
        if (runtimeModeRef.current === 'legacy') {
          return;
        }

        const feedHealth = createRuntimeFeedHealth(
          status,
          expectedPair,
          runtimeRunConstantsRef.current?.runId ?? null
        );
        EventBus.emit('marketRuntimeFeedHealth', feedHealth);
        maybeLogRuntimeFeedHealth(runtimeModeRef.current, status);
      },
      onData: (update: MarketUpdate) => {
        // CRITICAL: Ignore callbacks if this effect has been cleaned up
        if (isCancelled) {
          Logger.debug(
            `[useMarketData] Ignoring stale callback after cleanup for ${update.pair}`
          );
          return;
        }

        // CRITICAL: Verify the update is for the expected pair
        // This prevents race conditions when switching pairs quickly
        if (update.pair !== expectedPair) {
          Logger.warn(
            `[useMarketData] Pair mismatch! Expected ${expectedPair}, got ${update.pair}. Ignoring update.`
          );
          return;
        }

        const price = update.price;

        // Update last price time for timeout tracking
        lastPriceTimeRef.current = Date.now();
        if (timeoutTriggeredRef.current) {
          timeoutTriggeredRef.current = false;
          EventBus.emit('marketDataRecovered', { pair: pairRef.current });
          Logger.info(`[Market] Data recovered for ${update.pair}`);
        }

        // Feed price data to Admin Dashboard's PriceAnalyzerService
        priceAnalyzer.addPrice(update.pair, price, update.source);

        // Update Price History
        setPriceHistory(prevHistory => {
          const newHistory = [...prevHistory, price];
          if (newHistory.length > MAX_CHART_POINTS) return newHistory.slice(1);
          return newHistory;
        });

        // Calculate ATR using MarketCalculator (pure function)
        const atrResult = MarketCalculator.calculateATR(
          { high: update.high, low: update.low, close: price },
          atrContextRef.current
        );
        // Update ATR context for next calculation
        atrContextRef.current = {
          trHistory: atrResult.newTrHistory,
          prevClose: atrResult.newPrevClose,
        };

        const currentStatus = gameStatusRef.current;
        const currentEntryPrice = entryPriceRef.current;
        const currentPosition = positionRef.current;
        const currentLeverage = leverageRef.current;

        if (currentStatus === GameStatus.MENU) {
          setMarketData(prev => ({
            ...prev,
            price,
            pair: expectedPair, // Use captured pair, not ref
          }));
          return;
        }

        // Guard: If price is invalid, trigger timeout/pause
        if (!price || price <= 0) {
          if (currentStatus === GameStatus.PLAYING) {
            Logger.error(
              `[Market] Invalid price received: ${price}. Triggering pause.`
            );
            EventBus.emit('marketDataTimeout', {
              lastPriceTime: lastPriceTimeRef.current,
              disconnectedDuration: 0,
              pair: expectedPair,
            });
          }
          return;
        }

        // Calculate PnL using MarketCalculator (pure function)
        const pnlResult = MarketCalculator.calculatePnL({
          currentPrice: price,
          entryPrice: currentEntryPrice,
          position: currentPosition,
          leverage: currentLeverage,
        });

        // Calculate Liquidation Price using MarketCalculator (pure function)
        const dynamicLiquidationPrice = MarketCalculator.calculateLiquidationPrice({
          entryPrice: currentEntryPrice,
          leverage: currentLeverage,
          position: currentPosition,
        });

        const shouldEmitRuntimeEvents = runtimeModeRef.current !== 'legacy';
        const runtimeRunConstants = shouldEmitRuntimeEvents
          ? getOrCreateRunConstants(
              currentStatus,
              currentEntryPrice,
              currentPosition,
              currentLeverage,
              dynamicLiquidationPrice
            )
          : null;
        const effectiveLiquidationPrice =
          runtimeRunConstants?.liquidationPrice ?? dynamicLiquidationPrice;

        // Prefer server ATR (more reliable), fallback to client-calculated
        const hpPercent = (playerRef.current.hp / playerRef.current.maxHp) * 100;
        const playerLevel = playerRef.current.level;

        // Get current marketData to check for server ATR
        setMarketData(prevMarketData => {
          // Use server ATR if available, otherwise use client-calculated
          const effectiveAtrPercent = prevMarketData.atrPercent ?? atrResult.atrPercent;

          // Calculate Difficulty using raw PnL (Internal leverage handling in V2)
          const difficultyOutput = DifficultyManager.calculate(
            pnlResult.rawPnl, // Pass raw PnL, Manager handles leverage
            effectiveAtrPercent, // Prefer server ATR
            playerLevel,
            hpPercent
          );

          const nextData = {
            ...prevMarketData,
            price,
            volume: update.volume ?? 0,
            pnl: pnlResult.rawPnl,
            effectivePnl: pnlResult.effectivePnl,
            leverage: currentLeverage,
            position: currentPosition,
            liquidationPrice: effectiveLiquidationPrice,
            difficulty: difficultyOutput.total,
            spawnRateMultiplier: difficultyOutput.spawnRate,
            enemyDamage: difficultyOutput.enemyDamage,
            enemySpeed: difficultyOutput.enemySpeed,
            gemValueMultiplier: difficultyOutput.gemValueMultiplier,
            pair: expectedPair,
            symbol: expectedPair + 'USDT',
            momentum: difficultyOutput.total > 0 ? pnlResult.effectivePnl * 0.1 : 0, // Rudimentary momentum based on PnL
          };

          if (runtimeRunConstants && shouldEmitRuntimeEvents) {
            const recvTs = Date.now();
            const nextSeq = runtimeSeqRef.current + 1;
            const tick = createRuntimeTick({
              runId: runtimeRunConstants.runId,
              seq: nextSeq,
              pair: expectedPair,
              source: update.source,
              sourceTs: recvTs,
              recvTs,
              price: update.price,
              volume: update.volume,
              high: update.high,
              low: update.low,
              prevHash: runtimeHashRef.current,
            });

            runtimeSeqRef.current = nextSeq;
            runtimeHashRef.current = tick.hash;

            const runtimeController = ensureRuntimeController();
            if (
              runtimeController &&
              runtimeControllerRunIdRef.current !== runtimeRunConstants.runId
            ) {
              runtimeController.start(runtimeRunConstants);
              runtimeControllerRunIdRef.current = runtimeRunConstants.runId;
            }
            runtimeController?.pushTick(tick);

            const runtimeMode = runtimeModeRef.current;
            const provisionalRuntimeData: MarketData = {
              ...nextData,
              leverage: runtimeRunConstants.leverage as LeverageOption,
              position: toMarketPosition(runtimeRunConstants.position),
              liquidationPrice: runtimeRunConstants.liquidationPrice,
              runtimeRunId: runtimeRunConstants.runId,
              runtimeSeq: tick.seq,
              runtimeTickHash: tick.hash,
              algoVersion: runtimeRunConstants.versions.algoVersion,
              configVersion: runtimeRunConstants.versions.configVersion,
            };

            const workerAuthorityEnabled =
              runtimeMode === 'runtime' && runtimeController !== null;
            if (workerAuthorityEnabled) {
              rememberPendingRuntimeTick({
                tick,
                runConstants: runtimeRunConstants,
                sourceUpdate: update,
                provisionalMarketData: provisionalRuntimeData,
              });
              return provisionalRuntimeData;
            }

            if (runtimeMode === 'runtime' && !runtimeFallbackWarnedRef.current) {
              runtimeFallbackWarnedRef.current = true;
              Logger.warn(
                '[MarketRuntime] Worker unavailable, using local runtime compute fallback.'
              );
            }

            const runtimeComputeResult = computeRuntimeSnapshot({
              runConstants: runtimeRunConstants,
              tick,
              previousSnapshot: runtimePreviousSnapshotRef.current,
              previousState: runtimeComputeStateRef.current,
            });
            const runtimeSnapshot = runtimeComputeResult.snapshot;
            runtimeComputeStateRef.current = runtimeComputeResult.nextState;
            runtimePreviousSnapshotRef.current = runtimeSnapshot;

            if (runtimeMode === 'dual') {
              const rawPnlDelta = Number(
                (runtimeSnapshot.rawPnl - nextData.pnl).toFixed(8)
              );
              const effectivePnlDelta = Number(
                (runtimeSnapshot.effectivePnl - nextData.effectivePnl).toFixed(8)
              );

              if (rawPnlDelta !== 0 || effectivePnlDelta !== 0) {
                Logger.debug('[MarketRuntime] Dual drift', {
                  runId: runtimeSnapshot.runId,
                  seq: runtimeSnapshot.seq,
                  rawPnlDelta,
                  effectivePnlDelta,
                });
              }
            }

            const runtimeMarketData = createRuntimeMarketData(
              provisionalRuntimeData,
              runtimeRunConstants,
              runtimeSnapshot
            );

            const eventMarketData: MarketData =
              runtimeMode === 'dual'
                ? {
                    ...nextData,
                    runtimeRunId: runtimeSnapshot.runId,
                    runtimeSeq: runtimeSnapshot.seq,
                    runtimeChecksum: runtimeSnapshot.checksum,
                    runtimeTickHash: runtimeSnapshot.tickHash,
                    algoVersion: runtimeSnapshot.algoVersion,
                    configVersion: runtimeSnapshot.configVersion,
                  }
                : runtimeMarketData;

            emitRuntimeArtifacts(
              runtimeRunConstants,
              tick,
              runtimeSnapshot,
              eventMarketData,
              update
            );

            return runtimeMode === 'dual' ? eventMarketData : runtimeMarketData;
          }

          maybeLogRuntimeTelemetry(runtimeModeRef.current, update, nextData);

          // Emit for GameEngine (Ref tracking) to avoid React re-render overhead
          EventBus.emit('gameMarketUpdate', nextData);

          return nextData;
        });
      },
    });

    service.connect();

    // Listen for manual reconnect requests (from ErrorRecoveryService)
    const unsubReconnect = EventBus.on('marketReconnectRequest', () => {
      Logger.info(`[useMarketData] Reconnect requested for ${expectedPair}`);
      service.reconnect();
    });

    return () => {
      // CRITICAL: Set cancelled flag BEFORE destroying service
      // This ensures any pending callbacks are ignored
      isCancelled = true;
      unsubReconnect();
      runtimeControllerRef.current?.dispose();
      runtimeControllerRef.current = null;
      runtimeControllerRunIdRef.current = null;
      runtimeWorkerSnapshotRef.current = null;
      Logger.info(`[useMarketData] Destroying MarketService for ${expectedPair}`);
      service.destroy(); // Use destroy() instead of disconnect() for complete cleanup
    };
  }, [playerRef, pair]);

  return { marketData, priceHistory: _priceHistory };
};
