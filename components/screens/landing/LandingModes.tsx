import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Trophy, Check } from 'lucide-react';
import { staggerContainer, fadeInUp } from './motionVariants';

const CASUAL_ITEMS = [
  'Forgiving difficulty curve',
  'Practice without pressure',
  'All features unlocked',
  'Local progress saving',
  'Offline mode available',
];

const COMPETITIVE_ITEMS = [
  'Global leaderboards',
  'Anti-cheat validation',
  'Replay recording',
  'Achievement tracking',
  'Seasonal rankings',
];

export const LandingModes: React.FC = () => {
  return (
    <section className="relative z-10 border-t border-[#b22222]/10 px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mb-12 text-center sm:mb-16"
        >
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
            Choose Your Path
          </h2>
          <div className="font-cyber text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl">
            Game Modes
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid gap-4 sm:gap-6 md:grid-cols-2"
        >
          {/* Casual Mode */}
          <motion.div
            variants={fadeInUp}
            className="border-2 border-[#d6b85c]/20 bg-gradient-to-br from-[#d6b85c]/10 to-transparent p-6 transition-colors duration-300 sm:p-8"
          >
            <div className="mb-6 flex items-center gap-3">
              <Gamepad2 className="h-8 w-8 text-[#d6b85c]" />
              <h3 className="font-cyber text-xl font-black uppercase italic text-[#d6b85c] sm:text-2xl">
                Casual
              </h3>
            </div>
            <p className="mb-6 font-mono text-sm text-slate-400">
              Perfect for learning mechanics and enjoying relaxed gameplay.
            </p>
            <ul className="space-y-3">
              {CASUAL_ITEMS.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <Check className="h-4 w-4 flex-shrink-0 text-[#d6b85c]" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Competitive Mode */}
          <motion.div
            variants={fadeInUp}
            className="relative overflow-hidden border-2 border-[#b22222]/20 bg-gradient-to-br from-[#b22222]/10 to-transparent p-6 transition-colors duration-300 sm:p-8"
          >
            <div className="absolute right-4 top-4 bg-[#b22222] px-2 py-1 text-[8px] font-black uppercase tracking-wider text-white sm:text-[9px]">
              Pro
            </div>
            <div className="mb-6 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-[#ff6b6b]" />
              <h3 className="font-cyber text-xl font-black uppercase italic text-[#ff6b6b] sm:text-2xl">
                Competitive
              </h3>
            </div>
            <p className="mb-6 font-mono text-sm text-slate-400">
              Prove your skills on the global stage with verified runs.
            </p>
            <ul className="space-y-3">
              {COMPETITIVE_ITEMS.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <Check className="h-4 w-4 flex-shrink-0 text-[#ff6b6b]" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
