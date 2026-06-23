import React from 'react';
import { motion } from 'framer-motion';
import { trackRender } from '../../../utils/trackRender';
import { Zap, Globe, Activity, Code2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { AnimatedCounter } from './AnimatedCounter';
import { staggerContainer, fadeInUp } from './motionVariants';

export const LandingStats: React.FC = () => {
  trackRender('LandingStats');
  const { t } = useLanguage();

  return (
    <section className="relative z-10 border-b border-[#b22222]/10 bg-gradient-to-b from-transparent to-[#b22222]/[0.02] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4"
        >
          {[
            {
              value: 60,
              suffix: ' FPS',
              label: t('landing.stats.performance_target'),
              icon: Zap,
              color: '#00ffff',
            },
            {
              value: 8,
              suffix: '',
              label: t('landing.stats.languages'),
              icon: Globe,
              color: '#d6b85c',
            },
            {
              value: 24,
              suffix: '/7',
              label: t('landing.stats.live_market'),
              icon: Activity,
              color: '#b22222',
            },
            {
              value: 100,
              suffix: '%',
              label: t('landing.stats.open_source'),
              icon: Code2,
              color: '#22c55e',
            },
          ].map((stat, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="group relative border border-[#b22222]/20 bg-black/60 p-6 transition-all duration-500 hover:scale-105 hover:border-[#d6b85c]/40 sm:p-8"
            >
              <div className="absolute right-4 top-4 opacity-20 transition-opacity group-hover:opacity-40">
                <stat.icon className="h-8 w-8" style={{ color: stat.color }} />
              </div>
              <div className="mb-2 text-3xl font-black text-white sm:text-4xl lg:text-5xl">
                <AnimatedCounter
                  from={0}
                  to={stat.value}
                  suffix={stat.suffix}
                  duration={2.5}
                />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 sm:text-sm">
                {stat.label}
              </div>
              <div
                className="absolute bottom-0 left-0 h-1 w-0 transition-all duration-500 group-hover:w-full"
                style={{ background: stat.color }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
