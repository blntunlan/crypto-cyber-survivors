/**
 * DebugService - State Snapshot & Observability Tools
 *
 * Provides debugging utilities for capturing and exporting
 * the current state of all game systems. Useful for bug reports.
 */

import { GameStateMachine } from '../core/GameStateMachine';
import { TimeService } from '../core/TimeService';
import { ComboSystem } from '../combat/ComboSystem';
import { useGameStore } from '../../stores/gameStore';
import {
  ParticleConfigService,
  type ParticleEffectConfig,
} from '../system/ParticleConfigService';
import {
  RuntimeDiagnosticsService,
  type RuntimeDiagnosticsSnapshot,
} from './RuntimeDiagnosticsService';
import { Logger } from './Logger';

declare global {
  interface Window {
    gameDebug: {
      snapshot: () => GameSnapshot;
      exportSnapshot: () => void;
      logs: () => string[];
      clearLogs: () => void;
      performance: {
        snapshot: () => RuntimeDiagnosticsSnapshot;
        exportReport: () => void;
      };
      particles: {
        update: (
          group: 'trail' | 'impact' | 'collect',
          params: Partial<ParticleEffectConfig>
        ) => void;
        reset: () => void;
        current: () => {
          trail: ParticleEffectConfig;
          impact: ParticleEffectConfig;
          collect: ParticleEffectConfig;
        };
      };
      timeJump: (seconds: number) => void;
      help: () => void;
    };
  }
}

export interface GameSnapshot {
  timestamp: string;
  gameTime: number;
  gameState: string;
  stateHistory: Array<{ from: string; to: string; timestamp: number }>;
  combo: {
    killStreak: number;
    maxStreak: number;
    multiplier: number;
    totalKills: number;
  };
  difficulty: {
    wavePhase: string;
    totalElapsedSeconds: number;
  };
  settings: {
    graphics: unknown;
    mobile: unknown;
  };
  browser: {
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    devicePixelRatio: number;
  };
  performance: RuntimeDiagnosticsSnapshot;
}

class DebugServiceClass {
  private static instance: DebugServiceClass | null = null;
  private logs: string[] = [];

  private constructor() {
    this.setupGlobalAccess();
  }

  static getInstance(): DebugServiceClass {
    return (DebugServiceClass.instance ??= new DebugServiceClass());
  }

  /**
   * Make debug functions available globally for console access
   */
  private setupGlobalAccess(): void {
    if (!import.meta.env.DEV) return;
    if (typeof window !== 'undefined') {
      window.gameDebug = {
        // Raporlama
        snapshot: () => this.captureSnapshot(),
        exportSnapshot: () => this.exportSnapshot(),
        logs: () => this.getLogs(),
        clearLogs: () => this.clearLogs(),
        performance: {
          snapshot: () => RuntimeDiagnosticsService.getSnapshot(),
          exportReport: () => RuntimeDiagnosticsService.exportReport(),
        },

        // Canlı Partikül Ayarları
        particles: {
          update: (
            group: 'trail' | 'impact' | 'collect',
            params: Partial<ParticleEffectConfig>
          ) => ParticleConfigService.update(group, params),
          reset: () => ParticleConfigService.reset(),
          current: () => ({
            trail: ParticleConfigService.trail,
            impact: ParticleConfigService.impact,
            collect: ParticleConfigService.collect,
          }),
        },

        // Müdahale (CheatManager Köprüsü)
        // Bu özellikler sadece DEV modda CheatManager üzerinden tetiklenebilir
        // Zaman Müdahalesi (E2E Testleri için)
        timeJump: (seconds: number) => {
          TimeService.setGameTime(seconds * 1000);
          this.log(`Time jumped to ${seconds}s`);
        },

        help: () => {
          /* eslint-disable no-console */
          console.log(
            '%c🚀 CCS Gelişmiş Debug Araçları',
            'color: #fbbf24; font-size: 14px; font-weight: bold;'
          );
          console.log('--- Raporlama ---');
          console.log('gameDebug.snapshot() - Mevcut durumu JSON formatında verir.');
          console.log('gameDebug.exportSnapshot() - Durumu dosya olarak indirir.');
          console.log(
            'gameDebug.performance.snapshot() - Canli FPS/stutter teshis raporu.'
          );
          console.log(
            'gameDebug.performance.exportReport() - Runtime diagnostics JSON indirir.'
          );
          console.log('--- Kısayollar (Klavye) ---');
          console.log('L: Level Up | G: God Mode | K: Kill All | H: Heal');
          console.log('--- Kelime Kodları ---');
          console.log('"moon", "ape", "rekt"');
          /* eslint-enable no-console */
        },
      };
    }
  }

  /**
   * Capture a complete snapshot of all game systems
   */
  captureSnapshot(): GameSnapshot {
    const comboState = ComboSystem.getState();
    const storeState = useGameStore.getState();

    return {
      timestamp: new Date().toISOString(),
      gameTime: TimeService.getGameTime(),
      gameState: GameStateMachine.getState(),
      stateHistory: GameStateMachine.getHistory(),
      combo: {
        killStreak: comboState.killStreak,
        maxStreak: comboState.maxStreak,
        multiplier: comboState.comboMultiplier,
        totalKills: comboState.totalKills,
      },
      difficulty: {
        wavePhase: 'active',
        totalElapsedSeconds: TimeService.getGameTimeSeconds(),
      },
      settings: {
        graphics: storeState.graphics,
        mobile: storeState.mobile,
      },
      browser: {
        userAgent: navigator.userAgent,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      performance: RuntimeDiagnosticsService.getSnapshot(),
    };
  }

  /**
   * Export snapshot as a downloadable JSON file
   */
  exportSnapshot(): void {
    const snapshot = this.captureSnapshot();
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `game-snapshot-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    this.log('Snapshot exported');
  }

  /**
   * Add a log entry
   */
  log(message: string): void {
    const entry = `[${new Date().toISOString()}] ${message}`;
    this.logs.push(entry);

    // Keep logs manageable
    if (this.logs.length > 200) {
      this.logs.shift();
    }

    // Also log to console in development
    Logger.info(`[DebugService] ${message}`);
  }

  /**
   * Get all logs
   */
  getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }
}

export const DebugService = DebugServiceClass.getInstance();
