import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLORS } from '../../constants';
import { screenService } from '../../services/ScreenService';

interface MilestoneAnnouncerProps {
    show: boolean;
    text: string;
    color: string;
}

/**
 * DesktopAnnouncer - Uses CSS animations for a grand, stable feel on larger screens.
 */
const DesktopAnnouncer: React.FC<MilestoneAnnouncerProps> = ({ show, text, color }) => {
    if (!show || !text) return null;

    return (
        <div
            className="fixed left-1/2 -translate-x-1/2 z-[125] flex flex-col items-center pointer-events-none"
            style={{
                top: 'calc(6rem + env(safe-area-inset-top, 0px))',
                animation: 'milestoneIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
        >
            <div
                className="text-6xl font-black italic uppercase tracking-tighter text-center whitespace-nowrap"
                style={{
                    color: 'white',
                    textShadow: `3px 3px 0 #000, 0 0 15px ${color}`,
                }}
            >
                {text}
            </div>

            <div className="relative mt-3 flex items-center justify-center">
                <div
                    className="relative px-8 py-2 border-2 rounded-xl text-xl font-black italic flex items-center justify-center overflow-visible backdrop-blur-md"
                    style={{
                        color: COLORS.JACKPOT_YELLOW,
                        borderColor: COLORS.CASINO_GOLD,
                        backgroundColor: `${COLORS.SLOT_BLACK}CC`,
                        boxShadow: `0 0 25px ${color}50`,
                    }}
                >
                    <span className="relative z-10 tracking-widest">XP MULTIPLIER UP!</span>
                    <div
                        className="absolute top-1/2 left-1/2 -z-10"
                        style={{
                            width: '130%',
                            height: '240%',
                            transform: 'translate(-50%, -50%)',
                            filter: 'blur(30px)',
                            opacity: 0.5,
                            backgroundColor: color,
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

/**
 * MobileAnnouncer - Optimized for touch, using Framer Motion for buttery smooth 
 * performance and responsive positioning.
 */
const MobileAnnouncer: React.FC<MilestoneAnnouncerProps> = ({ show, text, color }) => {
    return (
        <AnimatePresence>
            {show && text && (
                <motion.div
                    className="fixed left-1/2 -translate-x-1/2 z-[125] flex flex-col items-center pointer-events-none"
                    initial={{ opacity: 0, y: -20, scale: 0.8, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    style={{
                        top: '25%',
                        width: '100vw'
                    }}
                >
                    <motion.div
                        className="text-3xl font-black italic uppercase tracking-tighter text-center"
                        style={{
                            color: 'white',
                            textShadow: `2px 2px 0 #000, 0 0 10px ${color}`,
                        }}
                    >
                        {text}
                    </motion.div>

                    <motion.div
                        className="relative mt-2"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div
                            className="relative px-6 py-1.5 border-2 rounded-lg text-sm font-black italic flex items-center justify-center backdrop-blur-sm"
                            style={{
                                color: COLORS.JACKPOT_YELLOW,
                                borderColor: COLORS.CASINO_GOLD,
                                backgroundColor: `${COLORS.SLOT_BLACK}E6`,
                                boxShadow: `0 0 15px ${color}40`,
                            }}
                        >
                            <span className="relative z-10 tracking-tight">XP MULTIPLIER UP!</span>

                            {/* Simplified glow for mobile perf */}
                            <div
                                className="absolute inset-0 -z-10 opacity-30 blur-lg"
                                style={{ backgroundColor: color }}
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

/**
 * MilestoneAnnouncer - Adaptive entry point that decides which announcer to show.
 */
export const MilestoneAnnouncer: React.FC<MilestoneAnnouncerProps> = memo((props) => {
    const [isMobile, setIsMobile] = useState(screenService.isMobile());

    useEffect(() => {
        const unsubscribe = screenService.onChange(() => {
            setIsMobile(screenService.isMobile());
        });
        return unsubscribe;
    }, []);

    if (isMobile) {
        return <MobileAnnouncer {...props} />;
    }

    return <DesktopAnnouncer {...props} />;
});
