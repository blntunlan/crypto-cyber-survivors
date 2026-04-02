import React from 'react';
import { motion } from 'framer-motion';
import { trackRender } from '../../../utils/trackRender';
import { Shield, Cpu, Activity } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { staggerContainer, fadeInUp } from './motionVariants';

export const LandingFeatures: React.FC = () => {
  trackRender('LandingFeatures');
  const { t } = useLanguage();

  return (
    <section
      id="engine"
      className="relative z-10 border-y border-[#b22222]/10 bg-[#b22222]/[0.02] py-20 sm:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mb-12 text-center sm:mb-16 lg:mb-20"
        >
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
            {t('landing.manifesto.title')}
          </h2>
          <div className="flex flex-col items-center justify-center gap-2 font-cyber text-2xl font-black uppercase italic text-white sm:gap-4 sm:text-4xl md:flex-row md:text-5xl lg:text-6xl">
            <span>{t('landing.manifesto.solo')}</span>
            <span className="hidden h-px w-8 bg-[#b22222] md:block" />
            <span className="text-[#b22222]">{t('landing.manifesto.enterprise')}</span>
          </div>
        </motion.div>

        {/* Grid Layout Sub-module */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
        >
          {[
            {
              tag: t('landing.features.tag_memory'),
              title: t('landing.features.title_memory'),
              desc: t('landing.features.desc_memory'),
              icon: Cpu,
            },
            {
              tag: t('landing.features.tag_physics'),
              title: t('landing.features.title_physics'),
              desc: t('landing.features.desc_physics'),
              icon: Shield,
            },
            {
              tag: t('landing.features.tag_state'),
              title: t('landing.features.title_state'),
              desc: t('landing.features.desc_state'),
              icon: Activity,
            },
            {
              tag: t('landing.features.tag_backend'),
              title: t('landing.features.title_backend'),
              desc: t('landing.features.desc_backend'),
              icon: Shield,
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              id={card.tag === 'BACKEND' ? 'pipeline' : undefined}
              className="group border border-white/5 bg-white/5 p-4 transition-all duration-300 focus-within:ring-2 focus-within:ring-[#d6b85c] hover:scale-[1.02] hover:border-[#d6b85c]/30 hover:bg-[#d6b85c]/5 active:scale-[0.98] sm:p-6"
            >
              <div className="mb-3 font-mono text-[10px] font-black tracking-widest text-[#b22222] sm:mb-4">
                {card.tag}
              </div>
              <h3 className="mb-3 font-cyber text-lg font-bold italic tracking-wide text-white transition-all duration-300 group-hover:text-[#d6b85c] sm:mb-4 sm:text-xl">
                {card.title}
              </h3>
              <p className="min-h-[48px] font-mono text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
