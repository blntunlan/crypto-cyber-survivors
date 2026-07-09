import React from 'react';
import { m } from 'framer-motion';
import { trackRender } from '../../../utils/trackRender';
import { staggerContainer, fadeInUp } from './motionVariants';

const FEATURE_CARDS = [
  {
    tag: 'MEMORY',
    title: 'OBJECT POOLS',
    desc: 'Bullets, enemies, and hit effects recycle through pools so runs stay smooth under pressure.',
  },
  {
    tag: 'PHYSICS',
    title: 'SPATIAL GRID',
    desc: 'Collision checks stay local to nearby cells instead of every enemy testing every bullet.',
  },
  {
    tag: 'STATE',
    title: 'HOT LOOP OFF REACT',
    desc: 'The canvas loop reads refs and services directly, keeping React out of 60 FPS combat frames.',
  },
  {
    tag: 'BACKEND',
    title: 'VERIFIED REWARDS',
    desc: 'In-game rewards are validated against server-side price history before coins land.',
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
            Engine Notes
          </h2>
          <div className="flex flex-col items-center justify-center gap-2 font-cyber text-2xl font-black uppercase italic text-white sm:gap-4 sm:text-4xl md:flex-row md:text-5xl lg:text-6xl">
            <span>60 FPS</span>
            <span className="hidden h-px w-8 bg-[#b22222] md:block" />
            <span className="text-[#b22222]">Live Market Rules</span>
          </div>
        </m.div>

        {/* Grid Layout Sub-module */}
        <m.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
        >
          {FEATURE_CARDS.map(card => (
            <m.div
              key={card.tag}
              variants={fadeInUp}
              id={card.tag === 'BACKEND' ? 'pipeline' : undefined}
              className="group border border-white/5 bg-white/5 p-4 transition-colors duration-300 focus-within:ring-2 focus-within:ring-[#d6b85c] hover:border-[#d6b85c]/30 hover:bg-[#d6b85c]/5 sm:p-6"
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
            </m.div>
          ))}
        </m.div>
      </div>
    </section>
  );
};
