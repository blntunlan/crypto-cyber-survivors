/**
 * CheatManager - Development Testing Utilities
 *
 * Keyboard shortcuts for testing game features.
 * Automatically disabled in production.
 */

export interface CheatCallbacks {
    onLevelUp: () => void;
    onHeal: () => void;
    onKillAll: () => void;
    onToggleGodMode: () => void;
    onSetLuck: (luck: number) => void;
    onAddExp: (amount: number) => void;
    onRestart?: () => void;
}

class CheatManagerClass {
    private static instance: CheatManagerClass | null = null;
    // Vite Dev Mode check
    private enabled: boolean = import.meta.env.DEV;
    private godMode: boolean = false;
    private callbacks: CheatCallbacks | null = null;
    private cheatBuffer: string = '';
    private cheatTimeout: number | null = null;
    private initialized: boolean = false;
    private boundHandleKeyDown: ((e: KeyboardEvent) => void) | null = null;

    private constructor() { }

    static getInstance(): CheatManagerClass {
        if (!CheatManagerClass.instance) {
            CheatManagerClass.instance = new CheatManagerClass();
        }
        return CheatManagerClass.instance;
    }

    /**
     * Initialize cheat system with callbacks
     */
    init(callbacks: CheatCallbacks): void {
        this.callbacks = callbacks;

        if (!this.enabled) return;

        if (!this.initialized) {
            this.boundHandleKeyDown = this.handleKeyDown.bind(this);
            window.addEventListener('keydown', this.boundHandleKeyDown);
            this.initialized = true;

            // eslint-disable-next-line no-console
            console.log(
                '%c🎮 CHEAT MODE ENABLED (DEV ONLY)',
                'color: #fbbf24; font-size: 16px; font-weight: bold;'
            );
        }
    }

    /**
     * Handle keyboard input
     */
    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.enabled || !this.callbacks) return;

        // Ignore if typing in input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        const key = e.key.toUpperCase();

        // Single key cheats
        switch (key) {
            case 'L':
                if (!e.ctrlKey && !e.altKey) {
                    this.callbacks.onLevelUp();
                    this.showCheatMessage('⬆️ LEVEL UP');
                }
                break;
            case 'H':
                if (!e.ctrlKey && !e.altKey) {
                    this.callbacks.onHeal();
                    this.showCheatMessage('💚 FULL HEAL');
                }
                break;
            case 'K':
                if (!e.ctrlKey && !e.altKey) {
                    this.callbacks.onKillAll();
                    this.showCheatMessage('💀 KILL ALL');
                }
                break;
            case 'G':
                if (!e.ctrlKey && !e.altKey) {
                    this.godMode = !this.godMode;
                    this.callbacks.onToggleGodMode();
                    this.showCheatMessage(this.godMode ? '🛡️ GOD MODE: ON' : '⚔️ GOD MODE: OFF');
                }
                break;
            case '1':
            case '2':
            case '3':
            case '4': {
                const lucks = [0, 2, 5, 10] as const;
                const value = lucks[parseInt(key) - 1] ?? 0;
                this.callbacks.onSetLuck(value);
                this.showCheatMessage(`🍀 LUCK: ${value}`);
                break;
            }
            case 'X':
                this.callbacks.onAddExp(500);
                this.showCheatMessage('✨ +500 EXP');
                break;
            case 'R':
                if (!e.ctrlKey && !e.altKey && this.callbacks.onRestart) {
                    this.callbacks.onRestart();
                    this.showCheatMessage('🔄 RESTART');
                }
                break;
        }

        // Buffer-based cheat codes (only for printable characters)
        if (e.key.length === 1) {
            this.cheatBuffer += e.key.toLowerCase();

            if (this.cheatTimeout) {
                clearTimeout(this.cheatTimeout);
            }
            this.cheatTimeout = window.setTimeout(() => {
                this.cheatBuffer = '';
            }, 2000);

            this.checkWordCheats();
        }
    }

    /**
     * Check for keyword-based cheats using the buffer
     */
    private checkWordCheats(): void {
        if (!this.callbacks) return;

        const wordCheats: Record<string, () => void> = {
            moon: () => {
                this.callbacks!.onSetLuck(10);
                this.showCheatMessage('🚀 TO THE MOON');
            },
            ape: () => {
                this.callbacks!.onSetLuck(100);
                this.callbacks!.onLevelUp();
                this.showCheatMessage('🦍 APE MODE');
            },
            rekt: () => {
                this.callbacks!.onAddExp(-500);
                this.showCheatMessage('📉 REKT: -500 EXP');
            },
        };

        for (const [code, action] of Object.entries(wordCheats)) {
            if (this.cheatBuffer.endsWith(code)) {
                action();
                this.cheatBuffer = '';
                break;
            }
        }
    }

    /**
     * Show cheat activation message on screen
     */
    private showCheatMessage(message: string): void {
        // eslint-disable-next-line no-console
        console.log(`%c${message}`, 'color: #fbbf24; font-weight: bold;');

        // Add essential animation styles only once
        if (!document.getElementById('cheat-style')) {
            const style = document.createElement('style');
            style.id = 'cheat-style';
            style.textContent = `
                @keyframes cheatFade {
                    0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
                    15% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    85% { opacity: 1; }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }

        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid #fbbf24;
            color: #fbbf24;
            padding: 8px 16px;
            border-radius: 6px;
            font-family: monospace;
            font-weight: bold;
            font-size: 13px;
            z-index: 9999;
            pointer-events: none;
            animation: cheatFade 2s ease-out forwards;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    /**
     * Check if god mode is active
     */
    isGodMode(): boolean {
        return this.godMode;
    }

    /**
     * Explicitly enable/disable (useful for specific overrides)
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.boundHandleKeyDown) {
            window.removeEventListener('keydown', this.boundHandleKeyDown);
            this.initialized = false;
        }
    }
}

export const CheatManager = CheatManagerClass.getInstance();
