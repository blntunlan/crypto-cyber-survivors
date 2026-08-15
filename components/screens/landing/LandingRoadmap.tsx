import React from 'react';
import { m } from 'framer-motion';
import { Check } from 'lucide-react';
import { staggerContainer, fadeInUp } from './motionVariants';

const ROADMAP_ITEMS = [
  {
    phase: 'Shipped',
    title: 'Engine & Backend',
    status: 'completed',
    items: [
      'Object-pooled 60 FPS canvas loop',
      'Railway API on Postgres',
      'Typed EventBus service core',
    ],
  },
  {
    phase: 'Live now',
    title: 'Market-Driven Difficulty',
    status: 'current',
    items: [
      'BTC/USD aggregated at ~1s',
      'RSI, ATR and volume drive spawns',
      'Server-verified run settlement',
    ],
  },
  {
    phase: 'Next',
    title: 'Leaderboards & Replays',
    status: 'upcoming',
    items: ['Ranked seasons', 'Run replay playback', 'Profile progression'],
  },
  {
    phase: 'Later',
    title: 'More Pairs, More Pressure',
    status: 'upcoming',
    items: ['ETH and SOL arenas', 'Daily challenge rotation', 'Seasonal events'],
  },
] as const;

export const LandingRoadmap: React.FC = () => {
  return (
    <section className="relative z-10 border-t border-[#b22222]/10 bg-[#b22222]/[0.02] px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <m.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="mb-12 text-center sm:mb-16"
        >
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
            DEVELOPMENT TIMELINE
          </h2>
          <div className="font-cyber text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl">
            ROADMAP
          </div>
        </m.div>

        <m.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {ROADMAP_ITEMS.map(phase => (
            <m.div
              key={phase.phase}
              variants={fadeInUp}
              className={`group relative border p-5 font-mono transition-all duration-300 sm:p-6 ${
                phase.status === 'current'
                  ? 'border-[#d6b85c]/60 bg-[#d6b85c]/[0.06] shadow-[0_0_25px_rgba(214,184,92,0.15)]'
                  : phase.status === 'completed'
                    ? 'border-emerald-500/40 bg-emerald-500/[0.04]'
                    : 'border-white/10 bg-[#070a14]/60'
              }`}
            >
              {/* HUD Reticle Corners */}
              <span className="pointer-events-none absolute left-1 top-1 text-[9px] leading-none text-[#d6b85c]/30 group-hover:text-[#ffd86a]">
                ┌
              </span>
              <span className="pointer-events-none absolute right-1 top-1 text-[9px] leading-none text-[#d6b85c]/30 group-hover:text-[#ffd86a]">
                ┐
              </span>
              <span className="pointer-events-none absolute bottom-1 left-1 text-[9px] leading-none text-[#d6b85c]/30 group-hover:text-[#ffd86a]">
                └
              </span>
              <span className="pointer-events-none absolute bottom-1 right-1 text-[9px] leading-none text-[#d6b85c]/30 group-hover:text-[#ffd86a]">
                ┘
              </span>

              {phase.status === 'current' && (
                <div className="absolute -right-2 -top-2 bg-[#d6b85c] px-2 py-0.5 text-[8px] font-black uppercase text-black">
                  ACTIVE
                </div>
              )}
              <div
                className={`mb-2 text-[10px] font-black tracking-widest ${
                  phase.status === 'current'
                    ? 'text-[#d6b85c]'
                    : phase.status === 'completed'
                      ? 'text-emerald-400'
                      : 'text-slate-400'
                }`}
              >
                {phase.phase}
              </div>
              <h3
                className={`mb-4 text-lg font-bold italic ${
                  phase.status === 'current'
                    ? 'text-[#d6b85c]'
                    : phase.status === 'completed'
                      ? 'text-emerald-400'
                      : 'text-white'
                } font-cyber`}
              >
                {phase.title}
              </h3>
              <ul className="space-y-2">
                {phase.items.map(item => (
                  <li
                    key={item}
                    className={`flex items-start gap-2 text-[11px] ${
                      phase.status === 'completed'
                        ? 'text-slate-400 line-through'
                        : 'text-slate-300'
                    }`}
                  >
                    {phase.status === 'completed' ? (
                      <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-400" />
                    ) : (
                      <span
                        className={`mt-0.5 w-3 flex-shrink-0 text-center ${
                          phase.status === 'current'
                            ? 'text-[#d6b85c]'
                            : 'text-slate-400'
                        }`}
                      >
                        ·
                      </span>
                    )}
                    {item}
                  </li>
                ))}
              </ul>
            </m.div>
          ))}
        </m.div>
      </div>
    </section>
  );
};
