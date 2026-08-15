import React from 'react';
import { m } from 'framer-motion';
import { trackRender } from '../../../utils/trackRender';
import { staggerContainer, fadeInUp } from './motionVariants';

const FEATURE_CARDS = [
  {
    tag: 'MEMORY',
    chip: 'ALLOCS: 0 / FRAME',
    title: 'OBJECT POOLS',
    desc: 'Bullets, enemies, and hit effects recycle through pre-allocated pools so runs stay at 60 FPS without GC spikes.',
  },
  {
    tag: 'PHYSICS',
    chip: 'COMPLEXITY: O(1)',
    title: 'SPATIAL GRID',
    desc: 'Collision checks stay partitioned to local grid buckets instead of every entity testing every projectile.',
  },
  {
    tag: 'STATE',
    chip: 'SYNC: REF / SERVICE',
    title: 'HOT LOOP OFF REACT',
    desc: 'The canvas engine reads refs and singleton services directly, keeping React state out of combat render frames.',
  },
  {
    tag: 'BACKEND',
    chip: 'AUTH: POSTGRES JWT',
    title: 'VERIFIED REWARDS',
    desc: 'Game payouts are validated server-side against historical market candles before coins land on your profile.',
  },
] as const;

export const LandingFeatures: React.FC = () => {
  trackRender('LandingFeatures');

  return (
    <section
      id="engine"
      className="relative z-10 border-y border-[#b22222]/10 bg-[#b22222]/[0.02] py-20 sm:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <m.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mb-12 text-center sm:mb-16 lg:mb-20"
        >
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
            ENGINE ARCHITECTURE
          </h2>
          <div className="flex flex-col items-center justify-center gap-2 font-cyber text-2xl font-black uppercase italic text-white sm:gap-4 sm:text-4xl md:flex-row md:text-5xl lg:text-6xl">
            <span>60 FPS RAW CANVAS</span>
            <span className="hidden h-px w-8 bg-[#ff6b6b] md:block" />
            <span className="text-[#ff6b6b]">LIVE MARKET DIRECTED</span>
          </div>
        </m.div>

        {/* Grid Layout Sub-module */}
        <m.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURE_CARDS.map(card => (
            <m.div
              key={card.tag}
              variants={fadeInUp}
              id={card.tag === 'BACKEND' ? 'pipeline' : undefined}
              className="group relative border border-white/10 bg-[#070b14]/70 p-5 font-mono transition-all duration-300 hover:border-[#d6b85c]/40 hover:bg-[#d6b85c]/[0.04] sm:p-6"
            >
              {/* HUD Reticle Corners */}
              <span className="pointer-events-none absolute left-1 top-1 text-[9px] leading-none text-[#d6b85c]/40 transition-colors duration-300 group-hover:text-[#ffd86a]">
                ┌
              </span>
              <span className="pointer-events-none absolute right-1 top-1 text-[9px] leading-none text-[#d6b85c]/40 transition-colors duration-300 group-hover:text-[#ffd86a]">
                ┐
              </span>
              <span className="pointer-events-none absolute bottom-1 left-1 text-[9px] leading-none text-[#d6b85c]/40 transition-colors duration-300 group-hover:text-[#ffd86a]">
                └
              </span>
              <span className="pointer-events-none absolute bottom-1 right-1 text-[9px] leading-none text-[#d6b85c]/40 transition-colors duration-300 group-hover:text-[#ffd86a]">
                ┘
              </span>

              <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                <span className="text-[10px] font-black tracking-widest text-[#ff6b6b]">
                  {card.tag}
                </span>
                <span className="border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[8px] font-bold text-slate-400">
                  {card.chip}
                </span>
              </div>

              <h3 className="mb-3 font-cyber text-lg font-bold italic tracking-wide text-white transition-colors duration-300 group-hover:text-[#d6b85c] sm:mb-4 sm:text-xl">
                {card.title}
              </h3>
              <p className="min-h-[48px] text-[11px] leading-relaxed text-slate-300 sm:text-xs">
                {card.desc}
              </p>
            </m.div>
          ))}
        </m.div>
      </div>
    </section>
  );
};
