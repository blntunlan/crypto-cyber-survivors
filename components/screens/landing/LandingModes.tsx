import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Trophy, Check } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { staggerContainer, fadeInUp } from './motionVariants';

export const LandingModes: React.FC = () => {
  const { t } = useLanguage();

  const list = (key: string): string[] =>
    t(key)
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean);

  const casualModeItems = list('landing.modes.casual_items');
  const competitiveModeItems = list('landing.modes.comp_items');

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
            {t('landing.modes.title')}
          </h2>
          <div className="font-cyber text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl">
            {t('landing.modes.subtitle')}
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
            whileHover={{ scale: 1.02 }}
            className="border-2 border-[#d6b85c]/20 bg-gradient-to-br from-[#d6b85c]/10 to-transparent p-6 transition-all duration-300 sm:p-8"
          >
            <div className="mb-6 flex items-center gap-3">
              <Gamepad2 className="h-8 w-8 text-[#d6b85c]" />
              <h3 className="font-cyber text-xl font-black uppercase italic text-[#d6b85c] sm:text-2xl">
                {t('landing.modes.casual_title')}
              </h3>
            </div>
            <p className="mb-6 font-mono text-sm text-slate-400">
              {t('landing.modes.casual_desc')}
            </p>
            <ul className="space-y-3">
              {casualModeItems.map((item, i) => (
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
            whileHover={{ scale: 1.02 }}
            className="relative overflow-hidden border-2 border-[#b22222]/20 bg-gradient-to-br from-[#b22222]/10 to-transparent p-6 transition-all duration-300 sm:p-8"
          >
            <div className="absolute right-4 top-4 bg-[#b22222] px-2 py-1 text-[8px] font-black uppercase tracking-wider sm:text-[9px]">
              {t('landing.modes.comp_pro_tag')}
            </div>
            <div className="mb-6 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-[#b22222]" />
              <h3 className="font-cyber text-xl font-black uppercase italic text-[#b22222] sm:text-2xl">
                {t('landing.modes.comp_title')}
              </h3>
            </div>
            <p className="mb-6 font-mono text-sm text-slate-400">
              {t('landing.modes.comp_desc')}
            </p>
            <ul className="space-y-3">
              {competitiveModeItems.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <Check className="h-4 w-4 flex-shrink-0 text-[#b22222]" />
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
