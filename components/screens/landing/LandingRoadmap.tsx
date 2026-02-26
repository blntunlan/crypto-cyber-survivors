import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Rocket } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { staggerContainer, fadeInUp } from './motionVariants';

export const LandingRoadmap: React.FC = () => {
  const { t } = useLanguage();

  const list = (key: string): string[] =>
    t(key)
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean);

  const roadmapItems = [
    {
      phase: t('landing.roadmap.phase1'),
      title: t('landing.roadmap.phase1_title'),
      status: 'completed',
      items: list('landing.roadmap.phase1_items'),
    },
    {
      phase: t('landing.roadmap.phase2'),
      title: t('landing.roadmap.phase2_title'),
      status: 'current',
      items: list('landing.roadmap.phase2_items'),
    },
    {
      phase: t('landing.roadmap.phase3'),
      title: t('landing.roadmap.phase3_title'),
      status: 'upcoming',
      items: list('landing.roadmap.phase3_items'),
    },
    {
      phase: t('landing.roadmap.phase4'),
      title: t('landing.roadmap.phase4_title'),
      status: 'upcoming',
      items: list('landing.roadmap.phase4_items'),
    },
  ];

  return (
    <section className="relative z-10 border-t border-[#b22222]/10 bg-[#b22222]/[0.02] px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mb-12 text-center sm:mb-16"
        >
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
            {t('landing.roadmap.title')}
          </h2>
          <div className="font-cyber text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl">
            {t('landing.roadmap.subtitle')}
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {roadmapItems.map((phase, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              whileHover={{ y: -5 }}
              className={`relative border p-5 transition-all duration-300 sm:p-6 ${
                phase.status === 'current'
                  ? 'border-[#d6b85c]/50 bg-[#d6b85c]/5 shadow-[0_0_20px_rgba(214,184,92,0.1)]'
                  : phase.status === 'completed'
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-white/10 bg-white/5'
              }`}
            >
              {phase.status === 'current' && (
                <div className="absolute -right-2 -top-2 bg-[#d6b85c] px-2 py-0.5 text-[8px] font-black uppercase text-black">
                  {t('landing.roadmap.active_tag')}
                </div>
              )}
              <div
                className={`mb-2 text-[10px] font-black tracking-widest ${
                  phase.status === 'current'
                    ? 'text-[#d6b85c]'
                    : phase.status === 'completed'
                      ? 'text-green-500'
                      : 'text-slate-500'
                }`}
              >
                {phase.phase}
              </div>
              <h3
                className={`mb-4 text-lg font-bold italic ${
                  phase.status === 'current'
                    ? 'text-[#d6b85c]'
                    : phase.status === 'completed'
                      ? 'text-green-400'
                      : 'text-white'
                } font-cyber`}
              >
                {phase.title}
              </h3>
              <ul className="space-y-2">
                {phase.items.map((item: string, j: number) => (
                  <li
                    key={j}
                    className={`flex items-start gap-2 font-mono text-[11px] ${
                      phase.status === 'completed'
                        ? 'text-slate-500 line-through'
                        : 'text-slate-400'
                    }`}
                  >
                    {phase.status === 'completed' ? (
                      <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                    ) : phase.status === 'current' ? (
                      <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0 text-[#d6b85c]" />
                    ) : (
                      <Rocket className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-600" />
                    )}
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
