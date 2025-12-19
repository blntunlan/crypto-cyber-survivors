/**
 * DebugService - State Snapshot & Observability Tools
 *
 * Provides debugging utilities for capturing and exporting
 * the current state of all game systems. Useful for bug reports.
 */

import { GameStateMachine } from './GameStateMachine';
import { TimeService } from './TimeService';
import { ComboSystem } from './ComboSystem';
import { DifficultyManager } from './DifficultyManager';
import { useGameStore } from '../stores/gameStore';

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
}

class DebugServiceClass {
    private static instance: DebugServiceClass | null = null;
    private logs: string[] = [];

    private constructor() {
        this.setupGlobalAccess();
    }

    static getInstance(): DebugServiceClass {
        if (!DebugServiceClass.instance) {
            DebugServiceClass.instance = new DebugServiceClass();
        }
        return DebugServiceClass.instance;
    }

    /**
     * Make debug functions available globally for console access
     */
    private setupGlobalAccess(): void {
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).gameDebug = {
                snapshot: () => this.captureSnapshot(),
                exportSnapshot: () => this.exportSnapshot(),
                logs: () => this.getLogs(),
                clearLogs: () => this.clearLogs(),
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
                wavePhase: DifficultyManager.getWavePhase(),
                totalElapsedSeconds: DifficultyManager.getTotalElapsedSeconds(),
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
        // eslint-disable-next-line no-console
        console.log(`[DebugService] ${message}`);
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
