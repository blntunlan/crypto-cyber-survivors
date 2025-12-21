import { useState, useEffect, useRef } from 'react';
import {
  MarketPosition,
  type MarketData,
  GameStatus,
  type Player,
  type LeverageOption,
} from '../types';
import { MarketService, type MarketUpdate } from '../services/marketService';
import { DifficultyManager } from '../services/DifficultyManager';
import { MAX_CHART_POINTS } from '../constants';
import { type CryptoPair } from '../types/crypto';

const ATR_PERIOD = 14;

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
  const trHistoryRef = useRef<number[]>([]);
  const prevCloseRef = useRef<number | null>(null);

  // Use refs for inputs to avoid stale closures in market service callback
  const gameStatusRef = useRef(gameStatus);
  const positionRef = useRef(position);
  const entryPriceRef = useRef(entryPrice);
  const leverageRef = useRef(leverage);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
    positionRef.current = position;
    entryPriceRef.current = entryPrice;
    leverageRef.current = leverage;
  }, [gameStatus, position, entryPrice, leverage]);

  // Session Reset & Cleanup (CRITICAL for pair switching)
  useEffect(() => {
    setPriceHistory([]);
    trHistoryRef.current = [];
    prevCloseRef.current = null;

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
    const service = new MarketService({
      pair,
      onData: (update: MarketUpdate) => {
        const price = update.price;

        // Update Price History
        setPriceHistory(prevHistory => {
          const newHistory = [...prevHistory, price];
          if (newHistory.length > MAX_CHART_POINTS) return newHistory.slice(1);
          return newHistory;
        });

        // Calculate ATR
        let currentTR = 0;
        if (update.high !== undefined && update.low !== undefined) {
          const h_l = update.high - update.low;
          const h_pc = prevCloseRef.current ? Math.abs(update.high - prevCloseRef.current) : 0;
          const l_pc = prevCloseRef.current ? Math.abs(update.low - prevCloseRef.current) : 0;
          currentTR = Math.max(h_l, h_pc, l_pc);
          trHistoryRef.current.push(currentTR);
          if (trHistoryRef.current.length > ATR_PERIOD) trHistoryRef.current.shift();
        }
        prevCloseRef.current = price;

        const atr =
          trHistoryRef.current.length > 0
            ? trHistoryRef.current.reduce((a, b) => a + b) / trHistoryRef.current.length
            : 0;

        const currentStatus = gameStatusRef.current;
        const currentEntryPrice = entryPriceRef.current;
        const currentPosition = positionRef.current;
        const currentLeverage = leverageRef.current;

        if (currentStatus === GameStatus.MENU) {
          setMarketData(prev => ({
            ...prev,
            price,
            pair: update.pair,
          }));
          return;
        }

        // Calculate Raw PnL
        let pnl = 0;
        if (currentEntryPrice > 0) {
          pnl = (price - currentEntryPrice) / currentEntryPrice;
          if (currentPosition === MarketPosition.SHORT) pnl = -pnl;
        }

        // Calculate Effective PnL (with leverage)
        const effectivePnl = pnl * currentLeverage;

        const atrPercent = price > 0 ? atr / price : 0;
        const hpPercent = (playerRef.current.hp / playerRef.current.maxHp) * 100;
        const playerLevel = playerRef.current.level;

        // Calculate Difficulty using EFFECTIVE PnL
        const difficultyOutput = DifficultyManager.calculate(
          effectivePnl, // Use amplified PnL for difficulty
          atrPercent,
          playerLevel,
          hpPercent
        );

        setMarketData({
          price,
          volume: update.volume || 0,
          pnl,
          effectivePnl,
          leverage: currentLeverage,
          rsi: 50, // Static for now
          difficulty: difficultyOutput.total,
          pair: update.pair,
          symbol: update.pair + 'USDT', // Approximate, can get from update if available or config
        });
      },
    });

    service.connect();
    return () => service.disconnect();
  }, [playerRef, pair]);

  return { marketData, priceHistory: _priceHistory };
};
