import React, { useEffect, useState, useRef } from 'react';
import { EventBus } from '../services/EventBus';
import { ComboSystem } from '../services/ComboSystem';
import { MilestoneService } from '../services/MilestoneService';
import { COLORS } from '../constants';
import { GameStatus, Player } from '../types';
import { audio } from '../services/audioService';
import { GameEnemy } from '../factories/EnemyFactory';
import { useDevice } from '../hooks/useDevice';
import { useGameStore } from '../stores/gameStore';
import { getHUDLayout } from '../config/UILayout';
import { DifficultyManager } from '../services/DifficultyManager';

// Import HUD sub-components
import {
    WaveTimer,
    FPSCounter,
    ClutchAnnouncement,
    LevelUpFlash,
    NearDeathGlow,
    EnemyPointers,
    AchievementPopup,
    MilestoneAnnouncer,
    ComboPanel,
} from './hud';

// Import animations
import './hud/hud-animations.css';

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
    // ---------- STATE ----------
    const [uiMeta, setUiMeta] = useState<ComboUIState>({
        milestoneText: '',
        milestoneColor: COLORS.NEON_ORANGE,
        maxStreak: 0,
        totalBonusXp: 0,
    });
    const device = useDevice();
    const { hudScale, showFPS: showFPSSource } = useGameStore(state => state.graphics);
    const layout = getHUDLayout(device.platform);
    const globalScale = layout.globalScale * hudScale;
    const [flash, setFlash] = useState(0);
    const [showMilestone, setShowMilestone] = useState(false);
    const [clutchActive, setClutchActive] = useState(false);
    const [achievement, setAchievement] = useState<{ name: string; icon: string; color: string } | null>(null);

    // ---------- REFS ----------
    const streakValueRef = useRef(0);
    const multiplierValueRef = useRef(1.0);
    const containerRef = useRef<HTMLDivElement>(null);
    const pointerContainerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number | null>(null);
    const milestoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const clutchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const achievementTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fpsFramesRef = useRef<number[]>([]);

    // ---------- EVENT SUBSCRIPTIONS ----------
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
            setAchievement(null);
            streakValueRef.current = 0;
            multiplierValueRef.current = 1.0;
        });

        const unsubAchievement = EventBus.on('milestoneAchieved', (data) => {
            if (achievementTimeoutRef.current) clearTimeout(achievementTimeoutRef.current);
            setAchievement({ name: data.name, icon: data.icon, color: data.color });
            achievementTimeoutRef.current = setTimeout(() => setAchievement(null), 3500);
        });

        return () => {
            unsubUpdate();
            unsubMilestone();
            unsubEnd();
            unsubLevelUp();
            unsubEnemyKilled();
            unsubReset();
            unsubAchievement();
            if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
            if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
            if (clutchTimeoutRef.current) clearTimeout(clutchTimeoutRef.current);
            if (achievementTimeoutRef.current) clearTimeout(achievementTimeoutRef.current);
        };
    }, [player]);

    // ---------- PERFORMANCE LOOP (Direct DOM) ----------
    useEffect(() => {
        let lastTime = performance.now();
        const fpsElement = document.getElementById('fps-counter');
        const healthGlowElement = document.getElementById('near-death-glow');

        const updateLoop = (currentTime: number) => {
            const deltaMs = currentTime - lastTime;
            lastTime = currentTime;

            // FPS Counter
            if (deltaMs > 0 && fpsElement) {
                const currentFps = 1000 / deltaMs;
                fpsFramesRef.current.push(currentFps);
                if (fpsFramesRef.current.length > 30) fpsFramesRef.current.shift();
                if (fpsFramesRef.current.length % 15 === 0) {
                    const avgFps = fpsFramesRef.current.reduce((a, b) => a + b, 0) / fpsFramesRef.current.length;
                    fpsElement.textContent = `${Math.round(avgFps)} FPS`;
                }
            }

            // Wave Timer
            // Survival Time
            const timerElement = document.getElementById('wave-timer-text');
            if (timerElement && status === GameStatus.PLAYING) {
                const totalSeconds = DifficultyManager.getTotalElapsedSeconds();
                const mins = Math.floor(totalSeconds / 60);
                const secs = Math.floor(totalSeconds % 60);
                timerElement.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                MilestoneService.checkTimeMilestones(totalSeconds);
            }

            // Near Death Glow
            if (healthGlowElement && player) {
                const hpPercent = player.hp / player.maxHp;
                if (hpPercent < 0.25) {
                    const pulse = 0.5 + Math.sin(currentTime / 200) * 0.3;
                    const intensity = (1 - (hpPercent / 0.25)) * pulse;
                    healthGlowElement.style.opacity = intensity.toString();
                } else {
                    healthGlowElement.style.opacity = '0';
                }
            }

            // Combo Streak Lerping
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

            // Combo Panel Visibility
            if (containerRef.current) {
                const isVisible = streakTarget >= 5;
                const targetOpacity = isVisible ? '1' : '0';
                const offset = layout.elements.comboPanel.offset || { x: 0, y: 0 };
                const targetTransform = isVisible
                    ? `translateX(calc(-50% + ${offset.x}px)) translateY(${offset.y}px) scale(1)`
                    : `translateX(calc(-50% + ${offset.x}px)) translateY(${offset.y + 20}px) scale(0.95)`;

                if (containerRef.current.style.opacity !== targetOpacity) {
                    containerRef.current.style.opacity = targetOpacity;
                    containerRef.current.style.transform = targetTransform;
                    // Keep pointer-events none to prevent stuttering/overlap issues on mobile
                    containerRef.current.style.pointerEvents = 'none';
                }

                if (isVisible) {
                    const timerBar = document.getElementById('combo-timer-bar');
                    if (timerBar) {
                        timerBar.style.width = `${ComboSystem.getComboTimeRemaining() * 100}%`;
                    }
                }
            }

            // Enemy Pointers
            if (pointerContainerRef.current && status === GameStatus.PLAYING && width > 0 && height > 0) {
                // Adjust dimensions for HUD scaling to ensure pointers hit screen edges
                const logicalWidth = width / globalScale;
                const logicalHeight = height / globalScale;

                const offScreenEnemies = enemies.filter(e =>
                    e.active && (e.x < 0 || e.x > width || e.y < 0 || e.y > height)
                ).slice(0, 10);

                const pointerElements = pointerContainerRef.current.children;

                for (let i = 0; i < 10; i++) {
                    const el = pointerElements[i] as HTMLElement;
                    if (!el) continue;

                    const enemy = offScreenEnemies[i];
                    if (enemy) {
                        const padding = 20; // Slightly tighter padding for scaled UI
                        const cx = width / 2;
                        const cy = height / 2;
                        const dx = enemy.x - cx;
                        const dy = enemy.y - cy;
                        const slope = dy / dx;
                        let px = 0, py = 0;

                        if (dx > 0) {
                            px = logicalWidth - padding;
                            py = (logicalHeight / 2) + ((logicalWidth / 2) - padding) * slope;
                        } else {
                            px = padding;
                            py = (logicalHeight / 2) - ((logicalWidth / 2) - padding) * slope;
                        }

                        if (py < padding) {
                            py = padding;
                            px = (logicalWidth / 2) + (padding - (logicalHeight / 2)) / slope;
                        } else if (py > logicalHeight - padding) {
                            py = logicalHeight - padding;
                            px = (logicalWidth / 2) + (logicalHeight - padding - (logicalHeight / 2)) / slope;
                        }

                        px = Math.max(padding, Math.min(logicalWidth - padding, px));
                        py = Math.max(padding, Math.min(logicalHeight - padding, py));

                        const angle = Math.atan2(enemy.y - cy, enemy.x - cx) * 180 / Math.PI + 90;

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
    }, [status, enemies, width, height, player, sessionStartTime, layout.elements.comboPanel.offset]);

    // ---------- RENDER ----------
    if (status === GameStatus.MENU) return null;

    return (
        <div
            className="absolute inset-0 pointer-events-none overflow-hidden select-none z-[100]"
            style={{
                '--hud-scale': globalScale.toString(),
                transform: `scale(${globalScale})`,
                transformOrigin: 'top left',
                width: `${100 / globalScale}%`,
                height: `${100 / globalScale}%`
            } as React.CSSProperties}
        >
            <NearDeathGlow />
            {layout.elements.waveTimer.visible && <WaveTimer />}
            {(layout.elements.fpsCounter.visible || showFPSSource) && <FPSCounter />}
            <EnemyPointers containerRef={pointerContainerRef} />
            <LevelUpFlash intensity={flash} />
            <ClutchAnnouncement active={clutchActive} />
            {layout.elements.comboPanel.visible && (
                <ComboPanel
                    containerRef={containerRef}
                    maxStreak={uiMeta.maxStreak}
                    totalBonusXp={uiMeta.totalBonusXp}
                />
            )}
            {layout.elements.milestoneAnnouncer.visible && (
                <MilestoneAnnouncer
                    show={showMilestone}
                    text={uiMeta.milestoneText}
                    color={uiMeta.milestoneColor}
                />
            )}
            {layout.elements.achievementPopup.visible && (
                <AchievementPopup achievement={achievement} />
            )}
        </div>
    );
};
