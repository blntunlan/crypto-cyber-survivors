import React from 'react';
import { m } from 'framer-motion';
import { Check } from 'lucide-react';
import { staggerContainer, fadeInUp } from './motionVariants';

const ROADMAP_ITEMS = [
  {
    phase: 'Shipped',
    title: 'Foundation',
    status: 'completed',
    items: ['Core gameplay loop', '60 FPS Canvas engine', 'Railway backend'],
  },
  {
    phase: 'Live now',
    title: 'Live Markets',
    status: 'current',
    items: ['Binance/Coinbase WSS', 'Market-driven difficulty', 'Anti-cheat system'],
  },
  {
    phase: 'Next',
    title: 'Social',
    status: 'upcoming',
    items: ['Global leaderboards', 'Replay sharing', 'Achievement badges'],
  },
  {
    phase: 'Later',
    title: 'Expansion',
    status: 'upcoming',
    items: ['Multi-crypto support', 'Daily challenges', 'Seasonal events'],
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
            Development Timeline
          </h2>
          <div className="font-cyber text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl">
            Roadmap
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
              className={`relative border p-5 transition-colors duration-300 sm:p-6 ${
                phase.status === 'current'
                  ? 'border-[#d6b85c]/50 bg-[#d6b85c]/5 shadow-[0_0_20px_rgba(214,184,92,0.1)]'
                  : phase.status === 'completed'
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-white/10 bg-white/5'
              }`}
            >
              {phase.status === 'current' && (
                <div className="absolute -right-2 -top-2 bg-[#d6b85c] px-2 py-0.5 text-[8px] font-black uppercase text-black">
                  Active
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
                {phase.items.map(item => (
                  <li
                    key={item}
                    className={`flex items-start gap-2 font-mono text-[11px] ${
                      phase.status === 'completed'
                        ? 'text-slate-500 line-through'
                        : 'text-slate-400'
                    }`}
                  >
                    {phase.status === 'completed' ? (
                      <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                    ) : (
                      <span
                        className={`mt-0.5 w-3 flex-shrink-0 text-center ${
                          phase.status === 'current'
                            ? 'text-[#d6b85c]'
                            : 'text-slate-600'
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
