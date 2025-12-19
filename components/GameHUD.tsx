import React, { useEffect, useState, useRef, useMemo } from 'react';
import { EventBus } from '../services/EventBus';
import { ComboSystem } from '../services/ComboSystem';
import { COLORS } from '../constants';
import { GameStatus } from '../types';
import { audio } from '../services/audioService';
import { useLerpValues } from '../hooks/useLerpValue';

interface ComboUIState {
    streak: number;
    multiplier: number;
    milestoneText: string;
    milestoneColor: string;
    maxStreak: number;
    totalBonusXp: number;
}

interface GameHUDProps {
    status: GameStatus;
}

export const GameHUD: React.FC<GameHUDProps> = ({ status }) => {
    const [combo, setCombo] = useState<ComboUIState>({
        streak: 0,
        multiplier: 1.0,
        milestoneText: '',
        milestoneColor: '',
        maxStreak: 0,
        totalBonusXp: 0,
    });

    const [flash, setFlash] = useState(0);
    const [showMilestone, setShowMilestone] = useState(false);

    // Single lerp hook for all smooth values (1 RAF instead of 4)
    const smoothValues = useLerpValues({
        streak: combo.streak,
        multiplier: combo.multiplier,
        maxStreak: combo.maxStreak,
        bonusXp: combo.totalBonusXp,
    }, { speed: 0.25, decimals: 1 });

    const requestRef = useRef<number | null>(null);
    const milestoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fpsFramesRef = useRef<number[]>([]);

    // Get next milestone for progress indicator
    const nextMilestone = useMemo(() => {
        return ComboSystem.getNextMilestone();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [combo.streak]);

    // Progress to next milestone (0-1)
    const milestoneProgress = useMemo(() => {
        if (!nextMilestone) return 1;
        const current = ComboSystem.getCurrentMilestone();
        const prevKills = current?.kills || 0;
        const range = nextMilestone.kills - prevKills;
        const progress = combo.streak - prevKills;
        return Math.min(1, progress / range);
    }, [combo.streak, nextMilestone]);

    useEffect(() => {
        const unsubUpdate = EventBus.on('comboUpdate', (data) => {
            // Cancel any pending reset
            if (resetTimeoutRef.current) {
                clearTimeout(resetTimeoutRef.current);
                resetTimeoutRef.current = null;
            }

            setCombo(prev => ({
                ...prev,
                streak: data.killStreak,
                multiplier: data.multiplier,
                totalBonusXp: data.totalBonusXp,
                timeRemaining: 1,
                maxStreak: ComboSystem.getMaxStreak(),
            }));
        });

        const unsubMilestone = EventBus.on('comboMilestone', (data) => {
            // Clear previous timeout if exists
            if (milestoneTimeoutRef.current) {
                clearTimeout(milestoneTimeoutRef.current);
            }

            setCombo(prev => ({
                ...prev,
                milestoneText: data.name,
                milestoneColor: data.color,
            }));

            setShowMilestone(true);

            // Play milestone sound
            audio.playComboMilestone(data.sound as 'combo1' | 'combo2' | 'combo3' | 'combo4' | 'combo5');

            // Set new timeout with ref tracking
            milestoneTimeoutRef.current = setTimeout(() => {
                setShowMilestone(false);
                setCombo(prev => ({ ...prev, milestoneText: '' }));
            }, 2500);
        });

        const unsubEnd = EventBus.on('comboEnd', (data) => {
            // Sync final bonus XP just in case, but don't add it to prev (avoid double count)
            setCombo(prev => ({
                ...prev,
                totalBonusXp: data.bonusXp,
            }));

            if (resetTimeoutRef.current) {
                clearTimeout(resetTimeoutRef.current);
            }

            resetTimeoutRef.current = setTimeout(() => {
                setCombo(prev => ({
                    ...prev,
                    streak: 0,
                    multiplier: 1.0,
                    milestoneText: '',
                    milestoneColor: '',
                    timeRemaining: 0,
                }));
                resetTimeoutRef.current = null;
            }, 300);
        });

        const unsubLevelUp = EventBus.on('levelUpStart', () => {
            // Clear previous flash timeout if exists
            if (flashTimeoutRef.current) {
                clearTimeout(flashTimeoutRef.current);
            }
            setFlash(1.0);
            // Reset flash after CSS transition completes
            flashTimeoutRef.current = setTimeout(() => {
                setFlash(0);
            }, 500);
        });

        const unsubReset = EventBus.on('gameReset', () => {
            setCombo({
                streak: 0,
                multiplier: 1.0,
                milestoneText: '',
                milestoneColor: '',
                maxStreak: 0,
                totalBonusXp: 0,
            });
            setFlash(0);
            setShowMilestone(false);
        });

        return () => {
            unsubUpdate();
            unsubMilestone();
            unsubEnd();
            unsubLevelUp();
            unsubReset();
            // Cleanup timeouts on unmount
            if (milestoneTimeoutRef.current) {
                clearTimeout(milestoneTimeoutRef.current);
            }
            if (flashTimeoutRef.current) {
                clearTimeout(flashTimeoutRef.current);
            }
            if (resetTimeoutRef.current) {
                clearTimeout(resetTimeoutRef.current);
            }
        };
    }, []);

    // Animation loop for smooth updates + FPS counter (DOM-based, no React re-render)
    useEffect(() => {
        let lastTime = performance.now();
        const fpsElement = document.getElementById('fps-counter');

        const updateLoop = (currentTime: number) => {
            // FPS calculation (DOM-based to avoid React re-renders)
            const deltaMs = currentTime - lastTime;
            lastTime = currentTime;

            if (deltaMs > 0 && fpsElement) {
                const currentFps = 1000 / deltaMs;
                fpsFramesRef.current.push(currentFps);

                // Keep last 30 frames for averaging
                if (fpsFramesRef.current.length > 30) {
                    fpsFramesRef.current.shift();
                }

                // Update FPS display every 15 frames (direct DOM, no setState)
                if (fpsFramesRef.current.length % 15 === 0) {
                    const avgFps = fpsFramesRef.current.reduce((a, b) => a + b, 0) / fpsFramesRef.current.length;
                    const roundedFps = Math.round(avgFps);
                    fpsElement.textContent = `${roundedFps} FPS`;

                    // Update color class
                    fpsElement.className = `px-2 py-1 rounded text-xs font-mono font-bold ${roundedFps >= 55 ? 'bg-green-500/80 text-white' :
                        roundedFps >= 30 ? 'bg-yellow-500/80 text-black' :
                            'bg-red-500/80 text-white'
                        }`;
                }
            }

            // Update combo timer bar via DOM (no React state update)
            if (status === GameStatus.PLAYING) {
                const timeLeft = ComboSystem.getComboTimeRemaining();
                const timerBar = document.getElementById('combo-timer-bar');
                if (timerBar) {
                    timerBar.style.width = `${timeLeft * 100}%`;
                }
            }
            requestRef.current = requestAnimationFrame(updateLoop);
        };

        requestRef.current = requestAnimationFrame(updateLoop);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [status]);

    if (status === GameStatus.MENU) return null;

    // Get glow intensity based on streak
    const glowIntensity = Math.min(1, combo.streak / 50);
    const currentColor = combo.milestoneColor || COLORS.NEON_ORANGE;

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* FPS Counter - Dev Mode Only (DOM-based, updated via JS) */}
            {import.meta.env.DEV && (
                <div className="absolute top-2 left-2 z-[100]">
                    <div
                        id="fps-counter"
                        className="px-2 py-1 rounded text-xs font-mono font-bold bg-green-500/80 text-white"
                    >
                        -- FPS
                    </div>
                </div>
            )}

            {/* Level Up Flash - CSS transition for frame-rate independence */}
            <div
                className="absolute inset-0 bg-white z-[60] pointer-events-none transition-opacity duration-500 ease-out"
                style={{ opacity: flash > 0 ? 0.5 : 0 }}
            />

            {/* Casino-Style Combo UI - Above HP Bar */}
            {combo.streak >= 5 && (
                <div
                    className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
                >
                    {/* Outer Glow Ring */}
                    <div
                        className="absolute -inset-4 rounded-full blur-xl transition-opacity duration-300"
                        style={{
                            backgroundColor: currentColor,
                            opacity: 0.15 + glowIntensity * 0.2,
                        }}
                    />

                    {/* Stats Bar - Max Streak & Bonus XP */}
                    <div className="flex gap-2 mb-1 text-[8px] font-mono uppercase tracking-wider">
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm">
                            <span className="text-slate-500">Best</span>
                            <span className="text-yellow-400 font-bold tabular-nums">{Math.round(smoothValues.maxStreak)}</span>
                        </div>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm">
                            <span className="text-slate-500">Bonus</span>
                            <span className="text-green-400 font-bold tabular-nums">+{Math.round(smoothValues.bonusXp)}</span>
                        </div>
                    </div>

                    {/* Main Combo Container - Fixed width to prevent shifting */}
                    <div
                        className="relative w-32 px-4 py-2 rounded-xl border backdrop-blur-sm"
                        style={{
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            borderColor: currentColor,
                            boxShadow: `0 0 ${10 + glowIntensity * 15}px ${currentColor}44`,
                        }}
                    >
                        {/* Next Milestone Progress */}
                        {nextMilestone && (
                            <div className="absolute -top-1 left-4 right-4 h-1 bg-black/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full transition-all duration-200"
                                    style={{
                                        width: `${milestoneProgress * 100}%`,
                                        backgroundColor: nextMilestone.color,
                                        boxShadow: `0 0 8px ${nextMilestone.color}`,
                                    }}
                                />
                            </div>
                        )}

                        {/* Combo Timer Bar - Updated via DOM for performance */}
                        <div className="w-full h-1 bg-black/60 mb-2 rounded-full overflow-hidden">
                            <div
                                id="combo-timer-bar"
                                className="h-full transition-all duration-75 ease-linear"
                                style={{
                                    width: '100%',
                                    backgroundColor: currentColor,
                                    boxShadow: `0 0 6px ${currentColor}`,
                                }}
                            />
                        </div>

                        {/* Streak Counter - Compact */}
                        <div className="flex items-baseline justify-center gap-1">
                            <span
                                className="text-2xl font-black tabular-nums"
                                style={{
                                    color: currentColor,
                                    textShadow: `0 0 10px ${currentColor}, 1px 1px 0 #000`,
                                }}
                            >
                                {Math.round(smoothValues.streak)}
                            </span>
                            <span
                                className="text-xs font-black uppercase tracking-wider"
                                style={{
                                    color: currentColor,
                                    textShadow: `0 0 5px ${currentColor}`,
                                }}
                            >
                                COMBO
                            </span>
                        </div>

                        {/* XP Multiplier Badge */}
                        {combo.multiplier > 1 && (
                            <div
                                className="mt-1 flex justify-center"
                            >
                                <div
                                    className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                                    style={{
                                        backgroundColor: `${currentColor}33`,
                                        color: currentColor,
                                        border: `1px solid ${currentColor}44`,
                                    }}
                                >
                                    ⚡ x{smoothValues.multiplier.toFixed(1)} XP
                                </div>
                            </div>
                        )}

                        {/* Next Milestone Hint */}
                        {nextMilestone && (
                            <div className="mt-1 text-center text-[8px] font-mono uppercase tracking-wider text-slate-500">
                                Next: <span style={{ color: nextMilestone.color }}>{nextMilestone.name}</span> @{nextMilestone.kills}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Milestone Announcement - Compact Style */}
            {showMilestone && combo.milestoneText && (
                <div
                    key={combo.milestoneText}
                    className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
                    style={{
                        animation: 'milestoneIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                >
                    {/* Background Glow */}
                    <div
                        className="absolute inset-0 -m-12 blur-2xl rounded-full"
                        style={{
                            backgroundColor: combo.milestoneColor,
                            opacity: 0.3,
                            animation: 'milestonePulse 1.5s ease-in-out infinite',
                        }}
                    />

                    {/* Main Text */}
                    <div
                        className="relative text-3xl md:text-4xl font-black uppercase tracking-tight whitespace-nowrap"
                        style={{
                            color: combo.milestoneColor,
                            textShadow: `
                                0 0 20px ${combo.milestoneColor},
                                0 0 40px ${combo.milestoneColor}66,
                                2px 2px 0 #000
                            `,
                            animation: 'bounce 0.4s ease-in-out',
                        }}
                    >
                        {combo.milestoneText}
                    </div>

                    {/* Multiplier Subtitle */}
                    <div
                        className="text-center mt-1 text-lg font-bold"
                        style={{
                            color: combo.milestoneColor,
                            textShadow: `0 0 10px ${combo.milestoneColor}`,
                        }}
                    >
                        x{combo.multiplier.toFixed(1)} XP
                    </div>
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes milestoneIn {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(2);
                    }
                    50% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(0.9);
                    }
                    100% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
                
                @keyframes milestonePulse {
                    0%, 100% {
                        opacity: 0.2;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.4;
                        transform: scale(1.15);
                    }
                }
            `}</style>
        </div>
    );
};
