import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, TIER_CONFIG, ALL_CARDS_FLAT } from '../../services/CardSystem';
import { COLORS } from '../../constants';
import { audio } from '../../services/audioService';
import { IconMarketChart, IconAlphaEye, IconFlashPulse, IconGenesisEmblem, IconShield, IconDiamond, IconRocket, IconApe, IconBolt, IconMagnet, IconSkull, IconWhale, IconBanano } from '../icons/CardIcons';

interface LevelUpScreenProps {
    upgradeChoices: Card[];
    onSelect: (card: Card) => void;
}

// Slot machine timing config - Psychologically Optimized 🧠
const SLOT_CONFIG = {
    SPIN_DURATION: 2000,       // Longer spin for anticipation "sweet spot"
    CARDS_PER_SPIN: 12,        // More cards = faster visual flow
    SPIN_INTERVAL: 60,         // 60ms = smooth 16fps card changes
    STOP_DELAY_BASE: 600,      // Base delay for first reel
    STOP_DELAY_INCREMENT: 600, // Each subsequent reel adds this much delay (cumulative)
    SLOWDOWN_DURATION: 400,    // Duration of the slowdown effect before stopping
};

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

const titleVariants = {
    hidden: { opacity: 0, y: -80, scale: 0.5 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring' as const, stiffness: 400, damping: 15 },
    },
};

// Slot reel component - handles spinning animation
interface SlotReelProps {
    finalCard: Card;
    reelIndex: number;
    stopOrder: number; // 0, 1, or 2 - when this reel stops relative to others
    onSelect: (card: Card) => void;
    onStopped?: () => void;
}

const SlotReel: React.FC<SlotReelProps> = ({ finalCard, reelIndex, stopOrder, onSelect, onStopped }) => {
    const [isStopped, setIsStopped] = useState(false);
    const [displayIndex, setDisplayIndex] = useState(0);
    const [phase, setPhase] = useState<'spinning' | 'slowing' | 'stopped'>('spinning');

    // Ref-based animation state to avoid React overhead during high-speed spinning
    const animRef = useRef({
        startTime: Date.now(),
        lastTickTime: 0,
        tickCount: 0,
        isSlowing: false,
        isDone: false
    });

    const spinCards = useMemo(() => {
        const pool = ALL_CARDS_FLAT.filter(c => c.id !== finalCard.id);
        const cards = [];
        for (let i = 0; i < SLOT_CONFIG.CARDS_PER_SPIN; i++) {
            cards.push(pool[Math.floor(Math.random() * pool.length)]);
        }
        return [...cards, finalCard];
    }, [finalCard]);

    useEffect(() => {
        const stopDelay = SLOT_CONFIG.SPIN_DURATION +
            (stopOrder * SLOT_CONFIG.STOP_DELAY_INCREMENT) +
            SLOT_CONFIG.STOP_DELAY_BASE;

        const totalDuration = stopDelay;
        const slowdownStartTime = stopDelay - SLOT_CONFIG.SLOWDOWN_DURATION;

        let rafId: number;

        const animate = (_time: number) => {
            const now = Date.now();
            const elapsed = now - animRef.current.startTime;

            if (elapsed >= totalDuration) {
                if (!animRef.current.isDone) {
                    animRef.current.isDone = true;
                    setDisplayIndex(spinCards.length - 1);
                    setPhase('stopped');
                    setIsStopped(true);
                }
                return;
            }

            // Determine current speed based on phase
            let currentInterval = SLOT_CONFIG.SPIN_INTERVAL;
            if (elapsed > slowdownStartTime) {
                if (!animRef.current.isSlowing) {
                    animRef.current.isSlowing = true;
                    setPhase('slowing');
                }
                const slowdownProgress = (elapsed - slowdownStartTime) / SLOT_CONFIG.SLOWDOWN_DURATION;
                currentInterval = SLOT_CONFIG.SPIN_INTERVAL + (slowdownProgress * 200);
            }

            // High-precision ticking for sounds and visual swaps
            if (now - animRef.current.lastTickTime > currentInterval) {
                animRef.current.lastTickTime = now;
                animRef.current.tickCount++;

                setDisplayIndex(prev => (prev + 1) % (spinCards.length - 1));

                // Sound on every display change, AudioService handles cooldown
                audio.playSlotTick(animRef.current.isSlowing ? 0.8 : 1);
            }

            rafId = requestAnimationFrame(animate);
        };

        rafId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafId);
    }, [stopOrder, spinCards.length]);

    useEffect(() => {
        if (isStopped) {
            audio.playReelStop(stopOrder + 1);
            onStopped?.();
        }
    }, [isStopped, stopOrder, onStopped]);

    const displayCard = (phase === 'stopped' ? finalCard : spinCards[displayIndex]) ?? finalCard;
    const tierConfig = TIER_CONFIG[displayCard.tier];
    const isSpinning = phase !== 'stopped';
    const isSlowingDown = phase === 'slowing';

    return (
        <motion.button
            onClick={() => isStopped && onSelect(finalCard)}
            disabled={!isStopped}
            className={`group flex flex-row items-center text-left p-3 md:p-5 rounded-xl md:rounded-2xl transition-all w-full relative overflow-hidden ${isStopped ? 'cursor-pointer hover:translate-x-2' : 'cursor-wait'}`}
            style={{
                backgroundColor: tierConfig.bgColor,
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: tierConfig.borderColor,
                boxShadow: displayCard.tier !== 'common' ? `0 0 30px ${tierConfig.glowColor}30` : 'none',
            }}
            initial={{ opacity: 0, x: -100 }}
            animate={{
                opacity: 1,
                x: 0,
                transition: { type: 'spring', stiffness: 400, damping: 30, delay: reelIndex * 0.1 }
            }}
            whileHover={isStopped ? { backgroundColor: `${tierConfig.bgColor}ee` } : {}}
            whileTap={isStopped ? { scale: 0.99 } : {}}
        >
            {/* Left: Icon & Badge */}
            <div className="flex flex-col items-center justify-center mr-4 md:mr-8 shrink-0 w-20 md:w-28">
                {/* Tier Badge */}
                <motion.div
                    className="text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-1 md:mb-2 text-center"
                    style={{ color: tierConfig.color }}
                    animate={{ opacity: isSpinning ? [0.5, 1, 0.5] : 1 }}
                    transition={isSpinning ? { duration: 0.1, repeat: Infinity } : {}}
                >
                    {tierConfig.name}
                </motion.div>

                {/* Spinning Icon Container */}
                <div className="text-3xl md:text-5xl flex items-center justify-center w-14 h-14 md:w-20 md:h-20 relative">
                    <motion.div
                        className="absolute inset-0 rounded-full blur-xl"
                        style={{ backgroundColor: tierConfig.color }}
                        animate={{
                            opacity: isSlowingDown ? [0.3, 0.6, 0.3] : isSpinning ? [0.1, 0.3, 0.1] : [0.1, 0.4, 0.1],
                            scale: isSlowingDown ? [1, 1.3, 1] : isSpinning ? 1 : [0.9, 1.2, 0.9],
                        }}
                        transition={{ duration: isSlowingDown ? 0.3 : isSpinning ? 0.2 : 1.5, repeat: Infinity }}
                    />

                    <motion.div
                        className="relative z-10"
                        style={{ mixBlendMode: 'plus-lighter' }}
                        animate={{
                            y: isSpinning ? (isSlowingDown ? [-10, 10] : [-20, 20]) : 0,
                            opacity: isSpinning ? (isSlowingDown ? [0.9, 1, 0.9] : [0.7, 1, 0.7]) : 1,
                            scale: isStopped ? [0.8, 1.15, 1] : isSlowingDown ? 1.05 : 1,
                        }}
                        transition={isSpinning ? { duration: isSlowingDown ? 0.15 : 0.1, repeat: Infinity, ease: 'linear' } : isStopped ? { duration: 0.4, ease: 'easeOut' } : {}}
                    >
                        <MemoizedCardIcon card={displayCard} color={tierConfig.color} scaleDown={true} />
                    </motion.div>
                </div>
            </div>

            {/* Middle/Right: Info */}
            <div className="flex-1 flex flex-col justify-center">
                <motion.div
                    className="text-base md:text-2xl font-black uppercase leading-none mb-1"
                    style={{ color: tierConfig.color }}
                    animate={{
                        opacity: isSpinning ? 0.7 : 1,
                        filter: isSpinning ? 'blur(2px)' : 'blur(0px)',
                    }}
                >
                    {displayCard.name}
                </motion.div>

                <motion.div
                    className="text-[10px] md:text-sm text-slate-300 font-bold leading-tight"
                    animate={{ opacity: isStopped ? 1 : 0 }}
                >
                    {isStopped ? displayCard.description : 'Decrypting slot...'}
                </motion.div>
            </div>

            {/* Far Right: Status/Instruction */}
            <div className="ml-4 shrink-0 hidden md:block">
                {isStopped ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="px-3 py-1 rounded bg-white/10 border border-white/20 text-[10px] font-black uppercase tracking-tighter text-white"
                    >
                        Select
                    </motion.div>
                ) : (
                    <div className="w-8 h-8 flex items-center justify-center">
                        <div className="w-1 h-4 bg-white/20 animate-pulse rounded-full mx-0.5" />
                        <div className="w-1 h-6 bg-white/40 animate-pulse rounded-full mx-0.5" style={{ animationDelay: '0.1s' }} />
                        <div className="w-1 h-4 bg-white/20 animate-pulse rounded-full mx-0.5" style={{ animationDelay: '0.2s' }} />
                    </div>
                )}
            </div>
        </motion.button>
    );
};

export const LevelUpScreen: React.FC<LevelUpScreenProps> = ({ upgradeChoices, onSelect }) => {
    // Track how many reels have stopped
    const [stoppedCount, setStoppedCount] = useState(0);
    const allStopped = stoppedCount >= upgradeChoices.length;

    // Generate random stop order (e.g., [2, 0, 1] means middle stops first, then right, then left)
    const stopOrder = useMemo(() => {
        const order = [0, 1, 2];
        return order.sort(() => Math.random() - 0.5);
    }, []);

    const handleReelStopped = () => {
        setStoppedCount(prev => prev + 1);
    };

    // Play win fanfare when all reels stopped
    useEffect(() => {
        if (allStopped) {
            // Small delay for dramatic effect
            setTimeout(() => {
                audio.playSlotWin();
            }, 200);
        }
    }, [allStopped]);

    // Get status text
    const getStatusText = () => {
        if (allStopped) return '✨ Choose your upgrade!';
        if (stoppedCount === 0) return '🎰 Spinning...';
        if (stoppedCount === 1) return '🎯 Almost there...';
        return '⚡ Last one!';
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="max-w-4xl w-full my-auto"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                >
                    {/* Title */}
                    <motion.div className="text-center mb-4 md:mb-10" variants={titleVariants}>
                        <motion.h3
                            className="text-2xl md:text-5xl font-black italic text-white tracking-tighter"
                            animate={{
                                textShadow: allStopped
                                    ? [
                                        '0 0 30px rgba(74, 222, 128, 0.5)',
                                        '0 0 60px rgba(74, 222, 128, 0.8)',
                                        '0 0 30px rgba(74, 222, 128, 0.5)',
                                    ]
                                    : [
                                        '0 0 20px rgba(255,255,255,0.3)',
                                        '0 0 40px rgba(255,255,255,0.5)',
                                        '0 0 20px rgba(255,255,255,0.3)',
                                    ],
                                scale: allStopped ? [1, 1.05, 1] : 1,
                            }}
                            transition={{ duration: allStopped ? 0.5 : 2, repeat: Infinity }}
                        >
                            LEVEL UP
                        </motion.h3>
                        <motion.p
                            className="font-bold uppercase text-[10px] md:text-xs mt-1 md:mt-2"
                            style={{ color: allStopped ? '#4ade80' : COLORS.ELECTRIC_BLUE }}
                            animate={{ opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                        >
                            {getStatusText()}
                        </motion.p>
                    </motion.div>

                    {/* Slot Reels - Vertical Layout for Web */}
                    <div className="flex flex-col gap-3 md:gap-4 max-w-2xl mx-auto">
                        {upgradeChoices.map((card, index) => (
                            <SlotReel
                                key={card.id}
                                finalCard={card}
                                reelIndex={index}
                                stopOrder={stopOrder[index] ?? index}
                                onSelect={onSelect}
                                onStopped={handleReelStopped}
                            />
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Helper function to render card icons - memoized for performance
const MemoizedCardIcon = React.memo(({ card, color, scaleDown = false }: { card: Card; color: string; scaleDown?: boolean }) => {
    const iconSizeClass = scaleDown ? 'w-10 h-10 md:w-16 md:h-16' : 'w-16 h-16';
    const iconProps = { className: `${iconSizeClass} relative z-10`, color };

    switch (card.icon) {
        case 'icon-market-chart':
            return <IconMarketChart {...iconProps} />;
        case 'icon-alpha-eye':
            return <IconAlphaEye {...iconProps} />;
        case 'icon-flash-pulse':
            return <IconFlashPulse {...iconProps} />;
        case 'icon-genesis-emblem': {
            const genesisSize = scaleDown ? 'w-12 h-12 md:w-20 md:h-20' : 'w-20 h-20';
            return <IconGenesisEmblem {...iconProps} className={`${genesisSize} relative z-10`} />;
        }
        case 'icon-shield':
            return <IconShield {...iconProps} />;
        case 'icon-diamond':
            return <IconDiamond {...iconProps} />;
        case 'icon-rocket':
            return <IconRocket {...iconProps} />;
        case 'icon-ape':
            return <IconApe {...iconProps} />;
        case 'icon-bolt':
            return <IconBolt {...iconProps} />;
        case 'icon-magnet':
            return <IconMagnet {...iconProps} />;
        case 'icon-skull':
            return <IconSkull {...iconProps} />;
        case 'icon-whale':
            return <IconWhale {...iconProps} />;
        case 'icon-banano':
            return <IconBanano {...iconProps} color="#FBDD11" />;
        default:
            if (card.icon.startsWith('/')) {
                return (
                    <img
                        src={card.icon}
                        alt={card.name}
                        className="w-full h-full object-contain relative z-10"
                        style={{ mixBlendMode: 'plus-lighter' }}
                    />
                );
            }
            return <span className="relative z-10">{card.icon}</span>;
    }
});
MemoizedCardIcon.displayName = 'MemoizedCardIcon';
