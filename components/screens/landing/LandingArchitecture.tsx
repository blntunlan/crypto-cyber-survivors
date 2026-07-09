import React from 'react';
import { motion } from 'framer-motion';
import { Terminal } from 'lucide-react';

export const LandingArchitecture: React.FC = () => {
  const technologyHighlights = [
    {
      badge: 'EVENT CORE',
      title: 'Typed EventBus',
      description:
        '150+ typed events decouple every system through an Observer-pattern bus.',
    },
    {
      badge: 'LIVE DATA',
      title: 'Dual-Exchange Feed',
      description:
        'Binance + Coinbase WebSockets aggregate server-side into a ~1s SSE stream with failover.',
    },
    {
      badge: 'ADAPTIVE',
      title: 'Unified Difficulty Director',
      description:
        'Live RSI, ATR, and volume become spawn pressure and rewards every cycle.',
    },
  ];

  return (
    <section id="dev" className="relative z-10 px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Descriptive Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <Terminal className="mb-6 h-10 w-10 text-[#d6b85c] sm:mb-8 sm:h-12 sm:w-12" />
            <h3 className="mb-6 font-cyber text-2xl font-black uppercase italic sm:mb-8 sm:text-3xl md:text-4xl lg:text-5xl">
              Built to Run Itself
            </h3>
            <p className="mb-6 font-mono text-sm leading-relaxed text-slate-400 sm:mb-8">
              As a solo indie developer, my requirement was simple: build a system that
              manages itself.
            </p>
            <div className="mb-6 grid gap-3 sm:mb-8 sm:grid-cols-3">
              {technologyHighlights.map(highlight => (
                <div
                  key={highlight.title}
                  className="border border-white/10 bg-black/30 p-3"
                >
                  <p className="mb-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#b22222]">
                    {highlight.badge}
                  </p>
                  <p className="mb-2 text-sm font-bold text-white">{highlight.title}</p>
                  <p className="font-mono text-[11px] leading-relaxed text-slate-400">
                    {highlight.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-4">
              {['React 19', 'TypeScript', 'Canvas 2D', 'Railway', 'PostgreSQL'].map(
                tag => (
                  <span
                    key={tag}
                    className="border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-tighter text-slate-500 sm:px-3 sm:text-[10px]"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </motion.div>

          {/* Visual Logic Diagram Sub-module */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            className="group relative overflow-hidden border-2 border-[#d6b85c]/20 bg-[#d6b85c]/5 p-6 sm:p-8"
          >
            <div className="absolute right-0 top-0 p-3 font-mono text-[10px] uppercase tracking-widest text-[#d6b85c]/50 sm:p-4">
              Design constraints
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="h-12 w-1 flex-shrink-0 bg-[#b22222]" />
                <div>
                  <div className="text-xs font-black uppercase italic text-white">
                    Systemic Balance
                  </div>
                  <div className="font-mono text-[10px] text-slate-500">
                    Difficulty scales automatically with Leverage (1x-100x).
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="h-12 w-1 flex-shrink-0 bg-[#d6b85c]" />
                <div>
                  <div className="text-xs font-black uppercase italic text-white">
                    Real-Time Integrity
                  </div>
                  <div className="font-mono text-[10px] text-slate-500">
                    WSS feed failover ensures zero game interruption.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="h-12 w-1 flex-shrink-0 bg-white" />
                <div>
                  <div className="text-xs font-black uppercase italic text-white">
                    60 FPS Native
                  </div>
                  <div className="font-mono text-[10px] text-slate-500">
                    Canvas-optimized rendering pipeline bypasses DOM overhead.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
