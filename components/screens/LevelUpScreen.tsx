import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../services/CardSystem';
import { COLORS } from '../../constants';
import { TIER_CONFIG } from '../../services/CardSystem';
import { IconMarketChart, IconAlphaEye, IconFlashPulse, IconGenesisEmblem, IconShield, IconDiamond, IconRocket, IconApe, IconBolt, IconMagnet, IconSkull, IconWhale, IconBanano } from '../icons/CardIcons';

interface LevelUpScreenProps {
    upgradeChoices: Card[];
    onSelect: (card: Card) => void;
}

// Animation variants - Slot Machine Style 🎰
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.1,
        },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.15 },
    },
};

const titleVariants = {
    hidden: { opacity: 0, y: -80, scale: 0.5 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: 'spring' as const,
            stiffness: 400,
            damping: 15,
        },
    },
};

// Slot machine card animation - fast drop with bounce
const cardVariants = {
    hidden: {
        opacity: 0,
        y: -300, // Start from above
        scale: 0.8,
        rotateZ: -5,
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateZ: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 500, // Fast
            damping: 25,    // Bouncy
            mass: 0.8,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.5,
        y: 100,
        transition: { duration: 0.15 },
    },
    hover: {
        scale: 1.05,
        y: -8,
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        transition: {
            type: 'spring' as const,
            stiffness: 400,
            damping: 20,
        },
    },
    tap: {
        scale: 0.98,
        y: 0,
    },
};

const glowVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: {
        opacity: [0.1, 0.4, 0.1],
        scale: [0.9, 1.2, 0.9],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut' as const,
        },
    },
};

// Icon slot spin animation
const iconVariants = {
    hidden: {
        scale: 0,
        opacity: 0,
        y: -50,
    },
    visible: {
        scale: 1,
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 600,
            damping: 15,
            delay: 0.2,
        },
    },
};

export const LevelUpScreen: React.FC<LevelUpScreenProps> = ({ upgradeChoices, onSelect }) => {
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
                    <motion.div
                        className="text-center mb-6 md:mb-10"
                        variants={titleVariants}
                    >
                        <motion.h3
                            className="text-4xl md:text-5xl font-black italic text-white tracking-tighter"
                            animate={{
                                textShadow: [
                                    '0 0 20px rgba(255,255,255,0.3)',
                                    '0 0 40px rgba(255,255,255,0.5)',
                                    '0 0 20px rgba(255,255,255,0.3)',
                                ],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            LEVEL UP
                        </motion.h3>
                        <p className="font-bold uppercase text-xs mt-2" style={{ color: COLORS.ELECTRIC_BLUE }}>
                            Choose your upgrade - Luck affects rarity!
                        </p>
                    </motion.div>

                    {/* Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {upgradeChoices.map((card, index) => {
                            const tierConfig = TIER_CONFIG[card.tier];
                            return (
                                <motion.button
                                    key={card.id}
                                    onClick={() => onSelect(card)}
                                    className="group flex flex-col items-center text-center p-4 md:p-8 rounded-2xl"
                                    style={{
                                        backgroundColor: tierConfig.bgColor,
                                        borderWidth: '2px',
                                        borderStyle: 'solid',
                                        borderColor: tierConfig.borderColor,
                                        boxShadow:
                                            card.tier !== 'common' ? `0 0 20px ${tierConfig.glowColor}40` : 'none',
                                    }}
                                    variants={cardVariants}
                                    whileHover="hover"
                                    whileTap="tap"
                                    custom={index}
                                >
                                    {/* Tier Badge */}
                                    <motion.div
                                        className="text-[10px] font-black uppercase tracking-widest mb-2"
                                        style={{ color: tierConfig.color }}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 + index * 0.1 }}
                                    >
                                        {tierConfig.name}
                                    </motion.div>

                                    {/* Icon Container */}
                                    <div className="text-5xl mb-4 flex items-center justify-center w-24 h-24 relative">
                                        {/* Animated Glow */}
                                        <motion.div
                                            className="absolute inset-0 rounded-full blur-2xl"
                                            style={{ backgroundColor: tierConfig.color }}
                                            variants={glowVariants}
                                            initial="initial"
                                            animate="animate"
                                        />

                                        {/* Icon - slot spin animation */}
                                        <motion.div
                                            className="relative z-10"
                                            style={{ mixBlendMode: 'plus-lighter' }}
                                            variants={iconVariants}
                                            initial="hidden"
                                            animate="visible"
                                        >
                                            {renderCardIcon(card, tierConfig.color)}
                                        </motion.div>
                                    </div>

                                    {/* Card Name */}
                                    <motion.div
                                        className="text-lg font-black mb-2 uppercase"
                                        style={{ color: tierConfig.color }}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 + index * 0.1 }}
                                    >
                                        {card.name}
                                    </motion.div>

                                    {/* Description */}
                                    <motion.div
                                        className="text-xs text-slate-400 font-bold"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.6 + index * 0.1 }}
                                    >
                                        {card.description}
                                    </motion.div>
                                </motion.button>
                            );
                        })}
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
