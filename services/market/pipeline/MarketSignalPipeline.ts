import { type MarketPosition } from '../../../types';
import { type CryptoPair } from '../../../types/crypto';
import { type MarketStateData } from '../../../types/events';
import { ClientIndicatorService } from '../../indicators/ClientIndicatorService';
import { getSpawnRateFromATR } from '../../../types/indicators';

interface ServerIndicatorSnapshot {
  rsi: number;
  rsiState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  atrPercent: number;
  normalizedVolume: number;
  whaleTier: 0 | 1 | 2 | 3;
  spawnRateMultiplier: number;
}

export interface MarketPipelineTickInput {
  pair: CryptoPair;
  position: MarketPosition;
  price: number;
  volume: number;
  timestamp: number;
  fallbackAtrPercent?: number;
  /** High price from OHLC candle (for accurate ATR) */
  high?: number;
  /** Low price from OHLC candle (for accurate ATR) */
  low?: number;
}

export interface MarketPipelineIndicators {
  rsi: number;
  rsiState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  atrPercent: number;
  normalizedVolume: number;
  whaleTier: 0 | 1 | 2 | 3;
  trendStrength: number;
  trendDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
  priceChangePercent: number;
  spawnRateMultiplier: number;
  isInitialized: boolean;
  source: 'client' | 'server-fallback' | 'hybrid';
}

export interface MarketPipelineResult {
  indicators: MarketPipelineIndicators;
}

const toPair = (pair: string): CryptoPair => {
  if (pair === 'ETH') return 'ETH';
  if (pair === 'SOL') return 'SOL';
  return 'BTC';
};

export class MarketSignalPipeline {
  private serverSnapshots = new Map<CryptoPair, ServerIndicatorSnapshot>();

  setContext(pair: CryptoPair, position: MarketPosition): void {
    ClientIndicatorService.setPair(pair);
    ClientIndicatorService.setPosition(position);
  }

  syncServerState(state: MarketStateData): void {
    const pair = toPair(state.pair);

    this.serverSnapshots.set(pair, {
      rsi: Number(state.rsi),
      rsiState: state.rsiState,
      atrPercent: Number(state.atrPercent),
      normalizedVolume: Number(state.normalizedVolume),
      whaleTier: state.whaleTier,
      spawnRateMultiplier: Number(state.spawnRateMultiplier),
    });
  }

  private resolveIndicators(
    pair: CryptoPair,
    fallbackAtrPercent: number | undefined
  ): MarketPipelineIndicators {
    const serverSnapshot = this.serverSnapshots.get(pair);
    const clientState = ClientIndicatorService.getState();

    const hasClient = clientState.isInitialized;
    const hasServer = serverSnapshot !== undefined;

    let source: MarketPipelineIndicators['source'] = 'client';
    if (!hasClient && hasServer) source = 'server-fallback';
    else if (hasClient && hasServer) source = 'hybrid';

    const atrPercent = hasClient
      ? clientState.atrPercent
      : (serverSnapshot?.atrPercent ?? fallbackAtrPercent ?? 0);

    const spawnFromAtr = getSpawnRateFromATR(atrPercent);

    return {
      rsi: hasClient ? clientState.rsi : (serverSnapshot?.rsi ?? 50),
      rsiState: hasClient
        ? clientState.rsiState
        : (serverSnapshot?.rsiState ?? 'NEUTRAL'),
      atrPercent,
      normalizedVolume: hasClient
        ? clientState.normalizedVolume
        : (serverSnapshot?.normalizedVolume ?? 0.5),
      whaleTier: hasClient ? clientState.whaleTier : (serverSnapshot?.whaleTier ?? 0),
      trendStrength: hasClient ? clientState.trendStrength : 0,
      trendDirection: hasClient ? clientState.trendDirection : 'SIDEWAYS',
      priceChangePercent: hasClient ? clientState.priceChangePercent : 0,
      spawnRateMultiplier: hasClient
        ? clientState.spawnRateMultiplier
        : (serverSnapshot?.spawnRateMultiplier ?? spawnFromAtr),
      isInitialized: hasClient || hasServer,
      source,
    };
  }

  processTick(input: MarketPipelineTickInput): MarketPipelineResult {
    this.setContext(input.pair, input.position);

    ClientIndicatorService.update(
      input.price,
      input.volume,
      input.timestamp,
      input.high,
      input.low
    );
    return {
      indicators: this.resolveIndicators(input.pair, input.fallbackAtrPercent),
    };
  }

  reset(): void {
    this.serverSnapshots.clear();
    ClientIndicatorService.reset();
  }
}

export const createMarketSignalPipeline = (): MarketSignalPipeline => {
  return new MarketSignalPipeline();
};
