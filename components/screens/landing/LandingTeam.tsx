import React from 'react';
import { motion } from 'framer-motion';
import { trackRender } from '../../../utils/trackRender';
import { ArrowUpRight } from 'lucide-react';
import { staggerContainer, fadeInUp } from './motionVariants';

const REPO_URL = 'https://github.com/blntunlan/crypto-cyber-survivors';

export const LandingTeam: React.FC = () => {
  trackRender('LandingTeam');

  const scope = [
    {
      area: 'Engine & Gameplay',
      detail:
        'Combat, physics, spawning, buffs, and the 60 FPS render loop — the singleton service layer.',
    },
    {
      area: 'Market & Backend',
      detail:
        'Live price feed ingestion, indicator pipeline, the SSE aggregator, and the Railway API.',
    },
    {
      area: 'Release & Ops',
      detail:
        'CI quality gates, anti-cheat, deployments, and production monitoring for the live runtime.',
    },
  ];

  return (
    <section
      id="team"
      className="relative z-10 border-t border-[#b22222]/10 px-4 py-20 sm:px-6 sm:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mb-12 text-center sm:mb-16"
        >
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
            WHO BUILDS THIS
          </h2>
          <div className="font-cyber text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl">
            ONE DEVELOPER, FULL STACK
          </div>
          <p className="mx-auto mt-6 max-w-2xl font-mono text-sm leading-relaxed text-slate-400 sm:text-base">
            Crypto Survivors is a solo project. No studio, no fake roster — one person
            owns the engine, the backend, and everything that ships.
          </p>
        </motion.div>

        {/* Founder card */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
          className="mx-auto mb-8 max-w-3xl border border-[#d6b85c]/25 bg-[#d6b85c]/[0.04] p-6 sm:p-8"
        >
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center border-2 border-[#d6b85c]/60 bg-black/50 font-cyber text-2xl font-black italic text-[#d6b85c]">
              BU
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-[#d6b85c]">
                Solo Developer &amp; Founder
              </p>
              <p className="text-2xl font-bold text-white">Bulent Unalan</p>
              <p className="mt-3 font-mono text-sm leading-relaxed text-slate-300">
                Designs and builds the whole stack — from the object-pooled game loop to
                the live market pipeline and release infrastructure.
              </p>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-4 inline-flex min-h-[44px] items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-slate-300 transition-colors duration-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c]"
              >
                @blntunlan on GitHub
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* What one person covers */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid gap-6 md:grid-cols-3"
        >
          {scope.map(item => (
            <motion.div
              key={item.area}
              variants={fadeInUp}
              className="group relative border border-white/10 bg-white/5 p-6 transition-colors duration-300 hover:border-[#d6b85c]/30 sm:p-8"
            >
              <p className="mb-2 font-cyber text-lg font-bold italic tracking-wide text-white transition-colors duration-300 group-hover:text-[#d6b85c]">
                {item.area}
              </p>
              <p className="font-mono text-sm leading-relaxed text-slate-400">
                {item.detail}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
