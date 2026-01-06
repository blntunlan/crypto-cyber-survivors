import { useState, useEffect, useRef } from 'react';
import {
  type MarketPosition,
  type MarketData,
  GameStatus,
  type Player,
  type LeverageOption,
} from '../types';
import { MarketService, type MarketUpdate } from '../services/MarketService';
import { MarketCalculator, type ATRContext } from '../services/MarketCalculator';
import { DifficultyManager } from '../services/DifficultyManager';
import { MAX_CHART_POINTS } from '../constants';
import { type CryptoPair } from '../types/crypto';
import { EventBus } from '../services/EventBus';
import { Logger } from '../services/Logger';
import { priceAnalyzer } from '../services/admin/PriceAnalyzerService';
import { type MarketStateData } from '../types/events';

// ATR_PERIOD is now managed by MarketCalculator

// Market data timeout configuration
const MARKET_DATA_TIMEOUT_MS = 30000; // 30 seconds without data = timeout
const TIMEOUT_CHECK_INTERVAL_MS = 5000; // Check every 5 seconds

export const useMarketData = (
  gameStatus: GameStatus,
  position: MarketPosition,
  entryPrice: number,
  leverage: LeverageOption,
  playerRef: React.RefObject<Player>,
  pair: CryptoPair = 'BTC'
) => {
  const [marketData, setMarketData] = useState<MarketData>({
    price: 0,
    volume: 0,
    pnl: 0,
    effectivePnl: 0,
    leverage: 1,
    rsi: 50,
    difficulty: 1,
    pair: 'BTC',
    symbol: 'BTCUSDT',
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

  useEffect(() => {
    gameStatusRef.current = gameStatus;
    positionRef.current = position;
    entryPriceRef.current = entryPrice;
    leverageRef.current = leverage;
    pairRef.current = pair;
  }, [gameStatus, position, entryPrice, leverage, pair]);

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

        Logger.error(`[Market] Data timeout - no price updates for ${timeSinceLastPrice}ms`);

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

    setMarketData(prev => ({
      ...prev,
      price: 0,
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

    Logger.info(`[useMarketData] Creating MarketService for ${expectedPair}`);

    const service = new MarketService({
      pair,
      onData: (update: MarketUpdate) => {
        // CRITICAL: Ignore callbacks if this effect has been cleaned up
        if (isCancelled) {
          Logger.debug(`[useMarketData] Ignoring stale callback after cleanup for ${update.pair}`);
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
        timeoutTriggeredRef.current = false; // Reset timeout flag on successful data

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

        // Guard: If price is invalid, only update price but keep difficulty stable
        if (!price || price <= 0) {
          setMarketData(prev => ({
            ...prev,
            price: prev.price, // Keep last known price
            pair: expectedPair, // Use captured pair
          }));
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
        const liquidationPrice = MarketCalculator.calculateLiquidationPrice({
          entryPrice: currentEntryPrice,
          leverage: currentLeverage,
          position: currentPosition,
        });

        // Prefer server ATR (more reliable), fallback to client-calculated
        const hpPercent = (playerRef.current.hp / playerRef.current.maxHp) * 100;
        const playerLevel = playerRef.current.level;

        // Get current marketData to check for server ATR
        setMarketData(prevMarketData => {
          // Use server ATR if available, otherwise use client-calculated
          const effectiveAtrPercent = prevMarketData.atrPercent ?? atrResult.atrPercent;

          // Calculate Difficulty using CAPPED PnL (not full leverage)
          const difficultyOutput = DifficultyManager.calculate(
            pnlResult.difficultyPnl, // Use capped PnL for difficulty (max 2x leverage effect)
            effectiveAtrPercent, // Prefer server ATR
            playerLevel,
            hpPercent
          );

          return {
            ...prevMarketData,
            price,
            volume: update.volume ?? 0,
            pnl: pnlResult.rawPnl,
            effectivePnl: pnlResult.effectivePnl,
            leverage: currentLeverage,
            position: currentPosition,
            liquidationPrice,
            difficulty: difficultyOutput.total,
            pair: expectedPair,
            symbol: expectedPair + 'USDT',
          };
        });
      },
    });

    service.connect();

    return () => {
      // CRITICAL: Set cancelled flag BEFORE destroying service
      // This ensures any pending callbacks are ignored
      isCancelled = true;
      Logger.info(`[useMarketData] Destroying MarketService for ${expectedPair}`);
      service.destroy(); // Use destroy() instead of disconnect() for complete cleanup
    };
  }, [playerRef, pair]);

  return { marketData, priceHistory: _priceHistory };
};
