import { EventBus } from '../core/EventBus';
import { type DifficultyInputs } from './types';
import { getDefaultInputs } from './utils';
import { LeverageEngine } from '../gameplay/LeverageEngine';
import type { MarketPosition, MarketRuntimeSnapshot } from '../../types';
import { DIFFICULTY_CONFIG } from './constants';

/**
 * DifficultyContextManager - V2
 * Stripped down to only aggregate raw metrics and market events
 * to feed the new `UnifiedDirector`.
 */
class DifficultyContextManager {
  private static instance: DifficultyContextManager | null = null;
  public inputs: DifficultyInputs;
  private hasRuntimeMarketAuthority = false;

  private constructor() {
    this.inputs = getDefaultInputs();

    EventBus.on('gameMarketUpdate', data => {
      this.inputs.pnlPercent = data.pnl;
      this.inputs.currentPrice = data.price;
      LeverageEngine.updateMarketState(this.inputs.atrPercent, data.pnl);
      this.recordPnLMove(data.pnl);
    });

    EventBus.on('marketRuntimeSnapshot', (snapshot: MarketRuntimeSnapshot) => {
      this.hasRuntimeMarketAuthority = true;
      this.inputs.pnlPercent = snapshot.rawPnl;
      this.inputs.currentPrice = snapshot.price;
      this.inputs.rsi = snapshot.rsi;
      this.inputs.atrPercent = snapshot.atrPercent;
      if (typeof snapshot.macd === 'number') {
        this.inputs.macd = {
          value: snapshot.macd,
          signal: 0,
          histogram: snapshot.macd,
          macd: snapshot.macd,
        };
      }
      this.recordPnLMove(snapshot.effectivePnl);
    });

    EventBus.on('clientIndicatorsUpdated', data => {
      if (this.hasRuntimeMarketAuthority) return;
      this.inputs.rsi = data.rsi;
      this.inputs.rsiState = data.rsiState;
      this.inputs.normalizedVolume = data.normalizedVolume;
      this.inputs.atrPercent = data.atrPercent;
      this.inputs.whaleTier = data.whaleTier;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (data.macd) {
        this.inputs.macd = {
          value: data.macd.value,
          signal: data.macd.signal,
          histogram: data.macd.histogram,
          macd: data.macd.macd ?? data.macd.value,
        };
      }
    });

    EventBus.on('gameStart', data => {
      if (data.leverage) {
        this.inputs.leverage = data.leverage;
        LeverageEngine.setLeverage(data.leverage);
      }
      if (data.position) {
        this.inputs.position = data.position as unknown as MarketPosition;
      }
      if (data.entryPrice) {
        this.inputs.entryPrice = data.entryPrice;
      }
      this.inputs.pnlHistory = [];
    });

    EventBus.on('gameReset', () => {
      this.inputs = getDefaultInputs();
      this.hasRuntimeMarketAuthority = false;
    });
  }

  public static getInstance(): DifficultyContextManager {
    return (DifficultyContextManager.instance ??= new DifficultyContextManager());
  }

  public updateTime(elapsedSeconds: number) {
    this.inputs.elapsedSeconds = elapsedSeconds;
  }

  public updateInputs(updates: Partial<DifficultyInputs>) {
    Object.assign(this.inputs, updates);
    if (updates.pnlPercent !== undefined) {
      this.recordPnLMove(updates.pnlPercent);
    }
  }

  public reset() {
    this.inputs = getDefaultInputs();
    this.hasRuntimeMarketAuthority = false;
  }

  private recordPnLMove(pnl: number) {
    const leveragedPnL = pnl * this.inputs.leverage;
    this.inputs.pnlHistory.push(leveragedPnL);
    if (this.inputs.pnlHistory.length > DIFFICULTY_CONFIG.pnlHistorySize) {
      this.inputs.pnlHistory.shift();
    }
  }

  public updateCombatState(killStreak: number, timeSinceLastKill: number) {
    this.inputs.killStreak = killStreak;
    this.inputs.timeSinceLastKill = timeSinceLastKill;
  }
}

export const difficultyContext = DifficultyContextManager.getInstance();
