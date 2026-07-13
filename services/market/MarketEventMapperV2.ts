/**
 * Records legacy market-event lifecycle data for analytics and debugging.
 * Gameplay effects are owned by the director, while HUD, VFX, and audio cues
 * are derived by PresentationDirector from director snapshots.
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import {
  type GameMarketEvent,
  type MarketEventPayload,
} from '../market/MarketEventManager';

export type MarketEventPresentation = {
  durationMs: number;
};

export const MARKET_EVENT_PRESENTATIONS: Record<
  GameMarketEvent,
  MarketEventPresentation
> = {
  VOLUME_SPIKE: { durationMs: 20_000 },
  WHALE_ALERT: { durationMs: 30_000 },
  FLASH_CRASH: { durationMs: 15_000 },
  PRICE_BREAKOUT: { durationMs: 25_000 },
  CONSOLIDATION: { durationMs: 30_000 },
};

type ActivePresentationEvent = {
  type: GameMarketEvent;
  startTime: number;
  endTime: number;
  intensity: number;
};

class MarketEventMapperV2Class {
  private static instance: MarketEventMapperV2Class | null = null;
  private activeEvents: ActivePresentationEvent[] = [];
  private eventHistory: Array<{
    type: GameMarketEvent;
    timestamp: number;
    intensity: number;
  }> = [];

  private constructor() {
    EventBus.on('gameMarketEvent', (payload: MarketEventPayload) => {
      this.onMarketEvent(payload);
    });
    EventBus.on('gameReset', () => this.reset());
    Logger.debug('[MarketEventMapperV2] Initialized as lifecycle-only recorder');
  }

  public static getInstance(): MarketEventMapperV2Class {
    return (MarketEventMapperV2Class.instance ??= new MarketEventMapperV2Class());
  }

  public update(_deltaMs: number): void {
    const now = Date.now();
    for (let index = this.activeEvents.length - 1; index >= 0; index -= 1) {
      const activeEvent = this.activeEvents[index];
      if (activeEvent && now >= activeEvent.endTime) {
        this.activeEvents.splice(index, 1);
      }
    }
  }

  public getActiveEffects(): ReadonlyArray<{
    type: GameMarketEvent;
    timeRemaining: number;
    intensity: number;
  }> {
    const now = Date.now();
    return this.activeEvents.map(activeEvent => ({
      type: activeEvent.type,
      timeRemaining: Math.max(0, activeEvent.endTime - now),
      intensity: activeEvent.intensity,
    }));
  }

  public getEventHistory(): ReadonlyArray<{
    type: GameMarketEvent;
    timestamp: number;
    intensity: number;
  }> {
    return [...this.eventHistory];
  }

  public isEventActive(type: GameMarketEvent): boolean {
    return this.activeEvents.some(activeEvent => activeEvent.type === type);
  }

  public getDebugState(): Record<string, unknown> {
    return {
      activeEffects: this.getActiveEffects(),
      eventCount: this.eventHistory.length,
    };
  }

  public reset(): void {
    this.activeEvents = [];
    this.eventHistory = [];
  }

  private onMarketEvent(payload: MarketEventPayload): void {
    const now = Date.now();
    const durationMs =
      payload.durationMs || MARKET_EVENT_PRESENTATIONS[payload.type].durationMs;
    const existingEvent = this.activeEvents.find(
      activeEvent => activeEvent.type === payload.type
    );

    if (existingEvent) {
      existingEvent.endTime = now + durationMs;
      existingEvent.intensity = Math.max(existingEvent.intensity, payload.intensity);
      return;
    }

    this.activeEvents.push({
      type: payload.type,
      startTime: now,
      endTime: now + durationMs,
      intensity: payload.intensity,
    });
    this.eventHistory.push({
      type: payload.type,
      timestamp: now,
      intensity: payload.intensity,
    });
  }
}

export const MarketEventMapperV2 = MarketEventMapperV2Class.getInstance();

export function createMarketEventMapperV2(): MarketEventMapperV2Class {
  (MarketEventMapperV2Class as unknown as { instance: null }).instance = null;
  return MarketEventMapperV2Class.getInstance();
}
