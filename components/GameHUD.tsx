import React, { useEffect, useState, useRef } from 'react';
import { EventBus } from '../services/EventBus';
import { ComboSystem } from '../services/ComboSystem';
import { COLORS } from '../constants';
import { GameStatus, Player } from '../types';
import { audio } from '../services/audioService';
import { GameEnemy } from '../factories/EnemyFactory';

interface ComboUIState {
    milestoneText: string;
    milestoneColor: string;
    maxStreak: number;
    totalBonusXp: number;
}

interface GameHUDProps {
    status: GameStatus;
    enemies?: GameEnemy[];
    width?: number;
    height?: number;
    player?: Player;
    sessionStartTime?: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({
    status,
    enemies = [],
    width = 0,
    height = 0,
    player,
    sessionStartTime = 0
}) => {
    const [uiMeta, setUiMeta] = useState<ComboUIState>({
        milestoneText: '',
        milestoneColor: COLORS.NEON_ORANGE,
        maxStreak: 0,
        totalBonusXp: 0,
    });

    const [flash, setFlash] = useState(0);
    const [showMilestone, setShowMilestone] = useState(false);
    const [clutchActive, setClutchActive] = useState(false);

    const streakValueRef = useRef(0);
    const multiplierValueRef = useRef(1.0);
    const containerRef = useRef<HTMLDivElement>(null);
    const pointerContainerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number | null>(null);

    const milestoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const clutchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fpsFramesRef = useRef<number[]>([]);

    useEffect(() => {
        const unsubUpdate = EventBus.on('comboUpdate', (data) => {
            setUiMeta(prev => ({
                ...prev,
                totalBonusXp: data.totalBonusXp,
                maxStreak: ComboSystem.getMaxStreak(),
            }));
        });

        const unsubMilestone = EventBus.on('comboMilestone', (data) => {
            if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
            setUiMeta(prev => ({
                ...prev,
                milestoneText: data.name,
                milestoneColor: data.color,
            }));
            setShowMilestone(true);
            audio.playComboMilestone(data.sound as 'combo1' | 'combo2' | 'combo3' | 'combo4' | 'combo5');
            milestoneTimeoutRef.current = setTimeout(() => setShowMilestone(false), 2500);
        });

        const unsubEnd = EventBus.on('comboEnd', (data) => {
            setUiMeta(prev => ({ ...prev, totalBonusXp: data.bonusXp }));
        });

        const unsubLevelUp = EventBus.on('levelUpStart', () => {
            if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
            setFlash(1.0);
            flashTimeoutRef.current = setTimeout(() => setFlash(0), 500);
        });

        const unsubEnemyKilled = EventBus.on('enemyKilled', () => {
            // Check for CLUTCH moment: kill enemy while health < 10%
            if (player && player.hp < player.maxHp * 0.1) {
                setClutchActive(true);
                if (clutchTimeoutRef.current) clearTimeout(clutchTimeoutRef.current);
                clutchTimeoutRef.current = setTimeout(() => setClutchActive(false), 1500);
            }
        });

        const unsubReset = EventBus.on('gameReset', () => {
            setUiMeta({
                milestoneText: '',
                milestoneColor: COLORS.NEON_ORANGE,
                maxStreak: 0,
                totalBonusXp: 0,
            });
            setShowMilestone(false);
            setFlash(0);
            setClutchActive(false);
            streakValueRef.current = 0;
            multiplierValueRef.current = 1.0;
        });

        return () => {
            unsubUpdate();
            unsubMilestone();
            unsubEnd();
            unsubLevelUp();
            unsubEnemyKilled();
            unsubReset();
            if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
            if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
            if (clutchTimeoutRef.current) clearTimeout(clutchTimeoutRef.current);
        };
    }, [player]);

    // PURE PERFORMANCE LOOP: No React setState here
    useEffect(() => {
        let lastTime = performance.now();
        const fpsElement = document.getElementById('fps-counter');
        const timerElement = document.getElementById('wave-timer-text');
        const healthGlowElement = document.getElementById('near-death-glow');

        const updateLoop = (currentTime: number) => {
            const deltaMs = currentTime - lastTime;
            lastTime = currentTime;

            // Direct DOM FPS Update
            if (deltaMs > 0 && fpsElement) {
                const currentFps = 1000 / deltaMs;
                fpsFramesRef.current.push(currentFps);
                if (fpsFramesRef.current.length > 30) fpsFramesRef.current.shift();
                if (fpsFramesRef.current.length % 15 === 0) {
                    const avgFps = fpsFramesRef.current.reduce((a, b) => a + b, 0) / fpsFramesRef.current.length;
                    fpsElement.textContent = `${Math.round(avgFps)} FPS`;
                }
            }

            // WAVE TIMER Update (Direct DOM)
            if (timerElement && status === GameStatus.PLAYING && sessionStartTime > 0) {
                const elapsedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
                const mins = Math.floor(elapsedSeconds / 60);
                const secs = elapsedSeconds % 60;
                timerElement.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            }

            // NEAR DEATH GLOW Update (Direct DOM)
            if (healthGlowElement && player) {
                const hpPercent = player.hp / player.maxHp;
                if (hpPercent < 0.25) {
                    // Pulse intensity based on time and how low health is
                    const pulse = 0.5 + Math.sin(currentTime / 200) * 0.3;
                    const intensity = (1 - (hpPercent / 0.25)) * pulse;
                    healthGlowElement.style.opacity = intensity.toString();
                } else {
                    healthGlowElement.style.opacity = '0';
                }
            }

            const liveState = ComboSystem.getState();
            const streakTarget = liveState.killStreak;
            const multTarget = liveState.comboMultiplier;

            if (Math.abs(streakValueRef.current - streakTarget) > 0.01) {
                streakValueRef.current += (streakTarget - streakValueRef.current) * 0.2;
                const el = document.getElementById('combo-streak-count');
                if (el) el.textContent = Math.round(streakValueRef.current).toString();
            }

            if (Math.abs(multiplierValueRef.current - multTarget) > 0.001) {
                multiplierValueRef.current += (multTarget - multiplierValueRef.current) * 0.1;
                const el = document.getElementById('combo-multiplier-badge');
                if (el) el.textContent = `${multiplierValueRef.current.toFixed(1)}x XP`;
            }

            if (containerRef.current) {
                const isVisible = streakTarget >= 5;
                const targetOpacity = isVisible ? '1' : '0';
                const targetTransform = isVisible ? 'translateX(-50%) translateY(0) scale(1)' : 'translateX(-50%) translateY(20px) scale(0.95)';

                if (containerRef.current.style.opacity !== targetOpacity) {
                    containerRef.current.style.opacity = targetOpacity;
                    containerRef.current.style.transform = targetTransform;
                    containerRef.current.style.pointerEvents = isVisible ? 'auto' : 'none';
                }

                if (isVisible) {
                    const timerBar = document.getElementById('combo-timer-bar');
                    if (timerBar) {
                        timerBar.style.width = `${ComboSystem.getComboTimeRemaining() * 100}%`;
                    }
                }
            }

            // ENEMY POINTER LOGIC (Direct DOM)
            if (pointerContainerRef.current && status === GameStatus.PLAYING && width > 0 && height > 0) {
                const offScreenEnemies = enemies.filter(e =>
                    e.active && (e.x < 0 || e.x > width || e.y < 0 || e.y > height)
                ).slice(0, 10);

                const pointerElements = pointerContainerRef.current.children;

                for (let i = 0; i < 10; i++) {
                    const el = pointerElements[i] as HTMLElement;
                    if (!el) continue;

                    const enemy = offScreenEnemies[i];
                    if (enemy) {
                        const padding = 30;
                        const cx = width / 2;
                        const cy = height / 2;
                        const dx = enemy.x - cx;
                        const dy = enemy.y - cy;
                        const slope = dy / dx;
                        let px = 0, py = 0;

                        if (dx > 0) {
                            px = width - padding;
                            py = cy + (width / 2 - padding) * slope;
                        } else {
                            px = padding;
                            py = cy - (width / 2 - padding) * slope;
                        }

                        if (py < padding) {
                            py = padding;
                            px = cx + (padding - cy) / slope;
                        } else if (py > height - padding) {
                            py = height - padding;
                            px = cx + (height - padding - cy) / slope;
                        }

                        px = Math.max(padding, Math.min(width - padding, px));
                        py = Math.max(padding, Math.min(height - padding, py));

                        const angle = Math.atan2(enemy.y - py, enemy.x - px) * 180 / Math.PI + 90;

                        el.style.opacity = '1';
                        el.style.transform = `translate(${px - 16}px, ${py - 16}px) rotate(${angle}deg)`;
                        el.style.color = enemy.color;

                        if (enemy.type === 'whale') {
                            el.style.scale = (1.6 + Math.sin(currentTime / 150) * 0.4).toString();
                        } else {
                            el.style.scale = '1';
                        }
                    } else {
                        el.style.opacity = '0';
                        el.style.transform = 'translate(-100px, -100px)';
                    }
                }
            } else if (pointerContainerRef.current) {
                const pointerElements = pointerContainerRef.current.children;
                for (let i = 0; i < pointerElements.length; i++) {
                    (pointerElements[i] as HTMLElement).style.opacity = '0';
                }
            }

            requestRef.current = requestAnimationFrame(updateLoop);
        };

        requestRef.current = requestAnimationFrame(updateLoop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [status, enemies, width, height, player, sessionStartTime]);

    if (status === GameStatus.MENU) return null;

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-[100]">
            {/* NEAR DEATH GLOW Overlay */}
            <div
                id="near-death-glow"
                className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(239,68,68,0.8)] z-[101]"
                style={{ opacity: 0, transition: 'opacity 0.2s ease-out' }}
            />

            {/* WAVE TIMER */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[110] flex flex-col items-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mb-1">Survival Time</div>
                <div id="wave-timer-text" className="text-3xl font-black italic tracking-tighter text-white drop-shadow-lg tabular-nums">0:00</div>
            </div>

            {/* FPS */}
            {import.meta.env.DEV && (
                <div className="absolute top-2 left-2 z-[110]">
                    <div id="fps-counter" className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-green-500/80 text-white shadow-lg">-- FPS</div>
                </div>
            )}

            {/* Enemy Pointers Container */}
            <div ref={pointerContainerRef} className="absolute inset-0 z-[105]">
                {[...Array(10)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute top-0 left-0 w-8 h-8 flex items-center justify-center transition-opacity duration-200"
                        style={{ opacity: 0, willChange: 'transform, opacity' }}
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="white" strokeWidth="2" className="w-full h-full drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                            <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
                        </svg>
                    </div>
                ))}
            </div>

            {/* Level Up Flash */}
            <div className="absolute inset-0 bg-white z-[120] pointer-events-none transition-opacity duration-500 ease-out" style={{ opacity: flash > 0 ? 0.3 : 0 }} />

            {/* CLUTCH! Announcement */}
            {clutchActive && (
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-[130] animate-bounce">
                    <div className="px-6 py-2 bg-red-600 text-white font-black italic text-4xl skew-x-[-12deg] shadow-[8px_8px_0_#000] border-4 border-black tracking-tighter">
                        CLUTCH!
                    </div>
                </div>
            )}

            {/* COMBO HUD */}
            <div
                ref={containerRef}
                className="absolute bottom-24 left-1/2 z-[115] bg-black/80 md:backdrop-blur-md rounded-xl p-3 border border-white/10 min-w-[150px] shadow-2xl transition-all duration-300 ease-out flex flex-col items-center"
                style={{ opacity: 0, transform: 'translateX(-50%) translateY(20px)', willChange: 'transform, opacity' }}
            >
                <div className="flex gap-3 mb-2 text-[9px] font-black uppercase tracking-widest">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                        <span>BEST</span>
                        <span className="tabular-nums">{uiMeta.maxStreak}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500">
                        <span>BONUS</span>
                        <span className="tabular-nums">+{Math.round(uiMeta.totalBonusXp)}</span>
                    </div>
                </div>

                <div className="w-full">
                    <div className="w-full h-1.5 bg-white/10 mb-3 rounded-full overflow-hidden p-[1px]">
                        <div id="combo-timer-bar" className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 shadow-[0_0_10px_orange]" style={{ width: '100%' }} />
                    </div>

                    <div className="flex items-baseline justify-center gap-2">
                        <span id="combo-streak-count" className="text-4xl font-black italic tracking-tighter text-white tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">0</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">COMBO</span>
                    </div>

                    <div id="combo-multiplier-badge" className="mt-2 px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-black italic tracking-tighter text-center text-xs shadow-xl">1.0x XP</div>
                </div>
            </div>

            {/* MILESTONE ANNOUNCER */}
            {showMilestone && uiMeta.milestoneText && (
                <div
                    key={uiMeta.milestoneText}
                    className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[125] flex flex-col items-center pointer-events-none"
                    style={{ animation: 'milestoneIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
                >
                    <div className="absolute inset-0 -m-20 blur-[100px] rounded-full" style={{ backgroundColor: uiMeta.milestoneColor, opacity: 0.5, animation: 'milestonePulse 2s ease-in-out infinite' }} />
                    <div className="relative text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-center" style={{ color: 'white', textShadow: `0 0 20px ${uiMeta.milestoneColor}, 0 0 40px ${uiMeta.milestoneColor}, 4px 4px 0 #000` }}>
                        {uiMeta.milestoneText}
                    </div>
                    <div className="mt-4 px-6 py-2 bg-black border-2 rounded-2xl text-2xl font-black italic" style={{ color: uiMeta.milestoneColor, borderColor: uiMeta.milestoneColor, boxShadow: `0 0 30px ${uiMeta.milestoneColor}66` }}>
                        XP MULTIPLIER UP!
                    </div>
                </div>
            )}

            <style>{`
                @keyframes milestoneIn {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(-10deg); filter: brightness(5) blur(20px); }
                    70% { opacity: 1; transform: translate(-50%, -50%) scale(1.1) rotate(2deg); filter: brightness(1.5) blur(0px); }
                    100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); filter: brightness(1) blur(0px); }
                }
                @keyframes milestonePulse {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.3); }
                }
            `}</style>
        </div>
    );
};
