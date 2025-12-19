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
    const [isSpinning, setIsSpinning] = useState(true);
    const [isSlowingDown, setIsSlowingDown] = useState(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isStopped, setIsStopped] = useState(false);

    const tickCountRef = useRef(0);

    // Get random cards for spinning (including all possible cards)
    const spinCards = useMemo(() => {
        const cards = ALL_CARDS_FLAT.filter((c: Card) => c.id !== finalCard.id);
        const shuffled = [...cards].sort(() => Math.random() - 0.5);
        return [...shuffled.slice(0, SLOT_CONFIG.CARDS_PER_SPIN - 1), finalCard];
    }, [finalCard]);

    // Spinning effect with slowdown
    useEffect(() => {
        if (!isSpinning) return;

        // Use ref-like approach with local variable for dynamic speed
        let currentSpeed = SLOT_CONFIG.SPIN_INTERVAL;
        let spinIntervalId: NodeJS.Timeout;
        tickCountRef.current = 0;

        const startSpinning = () => {
            spinIntervalId = setInterval(() => {
                setCurrentCardIndex(prev => (prev + 1) % spinCards.length);
                // Play tick sound every 3rd tick (not too spammy)
                tickCountRef.current++;
                if (tickCountRef.current % 3 === 0) {
                    audio.playSlotTick(1);
                }
            }, currentSpeed);
        };

        startSpinning();

        // Calculate cumulative stop delay: each reel waits longer
        // stopOrder 0 = 600ms, stopOrder 1 = 1200ms, stopOrder 2 = 1800ms
        const stopDelay = SLOT_CONFIG.SPIN_DURATION +
            (stopOrder * SLOT_CONFIG.STOP_DELAY_INCREMENT) +
            SLOT_CONFIG.STOP_DELAY_BASE;

        // Start slowdown phase before stopping
        const slowdownTimer = setTimeout(() => {
            setIsSlowingDown(true);
            // Restart interval with increasing delay
            clearInterval(spinIntervalId);

            let slowdownStep = 0;
            const slowdownLoop = () => {
                slowdownStep++;
                currentSpeed = SLOT_CONFIG.SPIN_INTERVAL + (slowdownStep * 25);

                spinIntervalId = setTimeout(() => {
                    setCurrentCardIndex(prev => (prev + 1) % spinCards.length);
                    if (currentSpeed < 180) {
                        slowdownLoop();
                    }
                }, currentSpeed);
            };
            slowdownLoop();
        }, stopDelay - SLOT_CONFIG.SLOWDOWN_DURATION);

        // Final stop
        const stopTimer = setTimeout(() => {
            clearInterval(spinIntervalId);
            clearTimeout(spinIntervalId as unknown as NodeJS.Timeout);
            setIsSpinning(false);
            setIsSlowingDown(false);
            // Animate to final card
            setCurrentCardIndex(spinCards.length - 1);
            setTimeout(() => {
                setIsStopped(true);
            }, 300);
        }, stopDelay);

        return () => {
            clearInterval(spinIntervalId);
            clearTimeout(spinIntervalId as unknown as NodeJS.Timeout);
            clearTimeout(stopTimer);
            clearTimeout(slowdownTimer);
        };
         
    }, [isSpinning, spinCards.length, stopOrder]);

    // Call onStopped when isStopped changes to true
    useEffect(() => {
        if (isStopped) {
            // Play reel stop sound with pitch based on stop order
            audio.playReelStop(stopOrder + 1);
            onStopped?.();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStopped]);

    const displayCard = (isSpinning ? spinCards[currentCardIndex] : finalCard) ?? finalCard;
    const tierConfig = TIER_CONFIG[displayCard.tier];

    return (
        <motion.button
            onClick={() => isStopped && onSelect(finalCard)}
            disabled={!isStopped}
            className={`group flex flex-col items-center text-center p-4 md:p-8 rounded-2xl transition-all ${isStopped ? 'cursor-pointer hover:scale-105' : 'cursor-wait'
                }`}
            style={{
                backgroundColor: tierConfig.bgColor,
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: tierConfig.borderColor,
                boxShadow: displayCard.tier !== 'common' ? `0 0 20px ${tierConfig.glowColor}40` : 'none',
            }}
            initial={{ opacity: 0, y: -300, scale: 0.8 }}
            animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                    type: 'spring',
                    stiffness: 500,
                    damping: 25,
                    delay: reelIndex * 0.15,
                },
            }}
            whileHover={isStopped ? { scale: 1.05, y: -8 } : {}}
            whileTap={isStopped ? { scale: 0.98 } : {}}
        >
            {/* Tier Badge */}
            <motion.div
                className="text-[10px] font-black uppercase tracking-widest mb-2"
                style={{ color: tierConfig.color }}
                animate={{ opacity: isSpinning ? [0.5, 1, 0.5] : 1 }}
                transition={isSpinning ? { duration: 0.1, repeat: Infinity } : {}}
            >
                {tierConfig.name}
            </motion.div>

            {/* Spinning Icon Container */}
            <div className="text-5xl mb-4 flex items-center justify-center w-24 h-24 relative overflow-hidden">
                {/* Glow - intensifies when slowing down */}
                <motion.div
                    className="absolute inset-0 rounded-full blur-2xl"
                    style={{ backgroundColor: tierConfig.color }}
                    animate={{
                        opacity: isSlowingDown ? [0.3, 0.6, 0.3] : isSpinning ? [0.1, 0.3, 0.1] : [0.1, 0.4, 0.1],
                        scale: isSlowingDown ? [1, 1.3, 1] : isSpinning ? 1 : [0.9, 1.2, 0.9],
                    }}
                    transition={{
                        duration: isSlowingDown ? 0.3 : isSpinning ? 0.2 : 1.5,
                        repeat: Infinity,
                    }}
                />

                {/* Card Icon with spin effect - slows down visually */}
                <motion.div
                    className="relative z-10"
                    style={{ mixBlendMode: 'plus-lighter' }}
                    animate={{
                        y: isSpinning ? (isSlowingDown ? [-10, 10] : [-20, 20]) : 0,
                        opacity: isSpinning ? (isSlowingDown ? [0.9, 1, 0.9] : [0.7, 1, 0.7]) : 1,
                        scale: isStopped ? [0.8, 1.15, 1] : isSlowingDown ? 1.05 : 1,
                    }}
                    transition={
                        isSpinning
                            ? { duration: isSlowingDown ? 0.15 : 0.1, repeat: Infinity, ease: 'linear' }
                            : isStopped
                                ? { duration: 0.4, ease: 'easeOut' }
                                : {}
                    }
                >
                    {renderCardIcon(displayCard, tierConfig.color)}
                </motion.div>
            </div>

            {/* Card Name */}
            <motion.div
                className="text-lg font-black mb-2 uppercase"
                style={{ color: tierConfig.color }}
                animate={{
                    opacity: isSpinning ? 0.7 : 1,
                    filter: isSpinning ? 'blur(2px)' : 'blur(0px)',
                }}
            >
                {displayCard.name}
            </motion.div>

            {/* Description - only show when stopped */}
            <motion.div
                className="text-xs text-slate-400 font-bold h-8"
                animate={{ opacity: isStopped ? 1 : 0 }}
            >
                {isStopped && displayCard.description}
            </motion.div>

            {/* Stopped indicator */}
            {isStopped && (
                <motion.div
                    className="mt-2 text-[8px] font-black uppercase tracking-widest text-white/50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    Click to Select
                </motion.div>
            )}
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
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
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
                    <motion.div className="text-center mb-6 md:mb-10" variants={titleVariants}>
                        <motion.h3
                            className="text-4xl md:text-5xl font-black italic text-white tracking-tighter"
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
                            className="font-bold uppercase text-xs mt-2"
                            style={{ color: allStopped ? '#4ade80' : COLORS.ELECTRIC_BLUE }}
                            animate={{ opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                        >
                            {getStatusText()}
                        </motion.p>
                    </motion.div>

                    {/* Slot Reels */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

// Helper function to render card icons
function renderCardIcon(card: Card, color: string) {
    const iconProps = { className: 'w-16 h-16 relative z-10', color };

    switch (card.icon) {
        case 'icon-market-chart':
            return <IconMarketChart {...iconProps} />;
        case 'icon-alpha-eye':
            return <IconAlphaEye {...iconProps} />;
        case 'icon-flash-pulse':
            return <IconFlashPulse {...iconProps} />;
        case 'icon-genesis-emblem':
            return <IconGenesisEmblem {...iconProps} className="w-20 h-20 relative z-10" />;
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
}
