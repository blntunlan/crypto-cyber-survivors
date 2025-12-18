import React, { useEffect, useState, useRef } from 'react';
import { EventBus } from '../services/EventBus';
import { ComboSystem } from '../services/ComboSystem';
import { COLORS } from '../constants';
import { GameStatus } from '../types';

interface ComboUIState {
    streak: number;
    multiplier: number;
    milestoneText: string;
    milestoneColor: string;
    timeRemaining: number;
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
        timeRemaining: 0,
    });

    const [flash, setFlash] = useState(0);

    const requestRef = useRef<number | null>(null);
    const milestoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const unsubUpdate = EventBus.on('comboUpdate', (data) => {
            setCombo(prev => ({
                ...prev,
                streak: data.killStreak,
                multiplier: data.multiplier,
                timeRemaining: 1,
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

            // Set new timeout with ref tracking
            milestoneTimeoutRef.current = setTimeout(() => {
                setCombo(prev => ({ ...prev, milestoneText: '' }));
            }, 2000);
        });

        const unsubEnd = EventBus.on('comboEnd', () => {
            setCombo({
                streak: 0,
                multiplier: 1.0,
                milestoneText: '',
                milestoneColor: '',
                timeRemaining: 0,
            });
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
                timeRemaining: 0,
            });
            setFlash(0);
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
        };
    }, []);

    // Animation loop for smooth updates
    useEffect(() => {
        const updateLoop = () => {
            if (status === GameStatus.PLAYING) {
                const timeLeft = ComboSystem.getComboTimeRemaining();
                setCombo(prev => {
                    if (prev.streak > 0 && Math.abs(prev.timeRemaining - timeLeft) > 0.01) {
                        return { ...prev, timeRemaining: timeLeft };
                    }
                    return prev;
                });
            }
            requestRef.current = requestAnimationFrame(updateLoop);
        };

        requestRef.current = requestAnimationFrame(updateLoop);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [status]);

    if (status === GameStatus.MENU) return null;

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Level Up Flash - CSS transition for frame-rate independence */}
            <div
                className="absolute inset-0 bg-white z-[60] pointer-events-none transition-opacity duration-500 ease-out"
                style={{ opacity: flash > 0 ? 0.5 : 0 }}
            />

            {/* Combo UI - Bottom Center */}
            {combo.streak >= 5 && (
                <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex flex-col items-center">

                    {/* Combo Bar */}
                    <div className="w-32 h-1.5 bg-black/50 mb-2 rounded-full overflow-hidden">
                        <div
                            className="h-full transition-all duration-75 ease-linear"
                            style={{
                                width: `${combo.timeRemaining * 100}%`,
                                backgroundColor: combo.milestoneColor || COLORS.NEON_ORANGE
                            }}
                        />
                    </div>

                    {/* Streak Count */}
                    <div
                        className="text-4xl font-bold font-mono stroke-black"
                        style={{
                            color: combo.milestoneColor || COLORS.NEON_ORANGE,
                            textShadow: '2px 2px 0px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
                        }}
                    >
                        {combo.streak}x COMBO
                    </div>

                    {/* Multiplier */}
                    {combo.multiplier > 1 && (
                        <div
                            className="text-lg font-mono font-bold mt-1"
                            style={{
                                color: combo.milestoneColor || COLORS.NEON_ORANGE,
                                textShadow: '1px 1px 0px #000'
                            }}
                        >
                            x{combo.multiplier.toFixed(1)} XP
                        </div>
                    )}
                </div>
            )}

            {/* Milestone Text - Top/Center */}
            {combo.milestoneText && (
                <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                    <div
                        className="text-6xl font-bold font-mono animate-bounce whitespace-nowrap"
                        style={{
                            color: combo.milestoneColor,
                            textShadow: '3px 3px 0px #000, -2px -2px 0 #000'
                        }}
                    >
                        {combo.milestoneText}
                    </div>
                </div>
            )}
        </div>
    );
};
