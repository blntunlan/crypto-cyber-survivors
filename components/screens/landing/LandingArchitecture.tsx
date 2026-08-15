import React from 'react';
import { motion } from 'framer-motion';
import { Terminal } from 'lucide-react';
import { trackRender } from '../../../utils/trackRender';
import { staggerContainer, fadeInUp } from './motionVariants';

const TECHNOLOGY_HIGHLIGHTS = [
  {
    badge: 'EVENT CORE',
    title: 'Typed EventBus',
    description:
      '150+ typed events decouple every system through an Observer-pattern bus.',
  },
  {
    badge: 'LIVE DATA',
    title: 'Live Price Feed',
    description:
      'Real-time market WebSockets aggregate server-side into a ~1s SSE stream with failover.',
  },
  {
    badge: 'ADAPTIVE',
    title: 'Unified Difficulty Director',
    description:
      'Live RSI, ATR, and volume become spawn pressure and rewards every cycle.',
  },
] as const;

export const LandingArchitecture: React.FC = () => {
  trackRender('LandingArchitecture');

  return (
    <section
      id="dev"
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
          <div className="mb-4 inline-flex items-center gap-2">
            <Terminal className="h-5 w-5 text-[#d6b85c]" />
            <span className="font-mono text-xs font-black uppercase tracking-[0.3em] text-[#ff6b6b]">
              SOLO INDIE ARCHITECTURE
            </span>
          </div>

          <h2 className="font-cyber text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl">
            BUILT TO RUN ITSELF
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-mono text-sm leading-relaxed text-slate-300 sm:text-base">
            No framework runs inside the render loop. React never touches a combat frame
            — the canvas reads refs and singleton services directly, allocates nothing
            per frame, and recycles every bullet and enemy through fixed-size pools.
          </p>
        </motion.div>

        {/* Stacked ledger — deliberately not a card grid, so this section does not
            repeat the rhythm of the engine cards directly above it. */}
        <motion.dl
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="mx-auto max-w-4xl border-t border-white/10 font-mono"
        >
          {TECHNOLOGY_HIGHLIGHTS.map((highlight, index) => (
            <motion.div
              key={highlight.title}
              variants={fadeInUp}
              className="group flex flex-col gap-2 border-b border-white/10 py-6 transition-colors duration-300 hover:bg-[#d6b85c]/[0.03] sm:flex-row sm:items-baseline sm:gap-8 sm:py-7"
            >
              <span className="font-cyber text-2xl font-black italic leading-none text-[#d6b85c]/40 transition-colors duration-300 group-hover:text-[#d6b85c] sm:w-16 sm:text-3xl">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="flex-1">
                <dt className="font-cyber text-lg font-bold italic tracking-wide text-white transition-colors duration-300 group-hover:text-[#d6b85c] sm:text-xl">
                  {highlight.title}
                </dt>
                <dd className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {highlight.description}
                </dd>
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ff6b6b] sm:w-28 sm:text-right">
                {highlight.badge}
              </span>
            </motion.div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
};
