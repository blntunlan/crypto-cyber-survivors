import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Cpu, Play, ArrowRight, Terminal, Activity } from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';

interface LandingPageProps {
  onLaunch: () => void;
  onViewPrivacy: () => void;
  onViewTerms: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunch,
  onViewPrivacy,
  onViewTerms,
}) => {
  const { isRetro } = useTheme();
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-[#d6b85c]/30 overflow-x-hidden allow-scroll">
      {/* Background Effects - Casino Cyber Mix */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#d6b85c]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#b22222]/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05]" />

        {/* Animated Scanlines */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent h-[2px] w-full animate-scanline" />
      </div>

      {/* Navigation */}
      <nav
        id="top"
        className="relative z-50 flex items-center justify-between px-6 py-8 mx-auto max-w-7xl"
      >
        <a href="#top" className="flex flex-col hover:opacity-80 transition-opacity">
          <span
            className={`text-2xl font-black tracking-tight uppercase font-display italic text-[#d6b85c] leading-tight ${!isRetro ? 'cyber-sway-text' : ''}`}
          >
            CRYPTO
          </span>
          <span
            className={`text-2xl font-black tracking-tight uppercase font-display italic text-white -mt-1 leading-tight ${!isRetro ? 'cyber-sway-text' : ''}`}
          >
            SURVIVORS
          </span>
        </a>

        <div className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] font-mono">
          <div className="relative group/nav">
            <div className="absolute -top-4 left-0 right-0 h-[2px] bg-[#b22222] shadow-[0_0_10px_rgba(178,34,34,0.5)]" />
            <a
              href="#engine"
              className="text-slate-400 hover:text-white transition-colors"
            >
              01. Engine
            </a>
          </div>
          <div className="relative group/nav">
            <div className="absolute -top-4 left-0 right-0 h-[2px] bg-[#b22222] shadow-[0_0_10px_rgba(178,34,34,0.5)]" />
            <a
              href="#pipeline"
              className="text-slate-400 hover:text-white transition-colors"
            >
              02. Data Pipeline
            </a>
          </div>
          <div className="relative group/nav">
            <div className="absolute -top-4 left-0 right-0 h-[2px] bg-[#b22222] shadow-[0_0_10px_rgba(178,34,34,0.5)]" />
            <a
              href="#dev"
              className="text-slate-400 hover:text-white transition-colors"
            >
              03. Solo Dev
            </a>
          </div>
          <button
            onClick={onLaunch}
            className="px-8 py-3 bg-[#d6b85c] text-black font-black rounded-sm hover:bg-white transition-all active:scale-95 shadow-[0_0_20px_rgba(214,184,92,0.3)]"
          >
            EXECUTE ENGINE
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 px-6 pt-24 pb-32 mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded bg-[#b22222]/10 border-l-4 border-[#b22222] text-[#b22222] text-xs font-black tracking-widest uppercase font-mono">
              SYSTEM STATUS: STANDBY_MODE (BETA_v1.0)
            </div>

            <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-8 leading-[0.8] font-display italic">
              HIGH STAKES <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d6b85c] via-[#ffd600] to-white">
                VOLATILITY
              </span>
            </h1>

            <p className="max-w-xl text-lg text-slate-400 mb-12 leading-relaxed font-mono">
              Crafting a <span className="text-[#d6b85c]">systematic bridge</span>{' '}
              between live financial markets and rogue-lite hyper-casual gameplay. A
              solo-indie endeavor pushing the limits of React-based game engineering.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={onLaunch}
                className="group relative px-10 py-5 bg-[#d6b85c] text-black font-black text-2xl hover:bg-[#ffd600] transition-all hover:shadow-[0_0_40px_rgba(214,184,92,0.4)] flex items-center gap-3 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-x-0 h-[2px] bg-white opacity-20 -top-full group-hover:top-full transition-all duration-700" />
                <Play className="w-6 h-6 fill-current" />
                START SURVIVAL
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="https://github.com/blntunlan/crypto-cyber-survivors"
                target="_blank"
                className="px-8 py-5 border border-[#b22222]/30 hover:bg-[#b22222]/10 transition-all flex items-center gap-3 font-bold text-xs tracking-widest uppercase text-slate-300"
              >
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                Inspect Protocol
              </a>
            </div>
          </motion.div>

          {/* Technical Terminal Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="flex-1 w-full max-w-lg lg:max-w-none"
          >
            <div className="relative p-6 rounded-sm bg-black border-2 border-[#b22222]/30 shadow-[0_0_50px_rgba(178,34,34,0.1)] font-mono text-sm leading-snug">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#b22222]/20">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-[#b22222]" />
                  <div className="w-2 h-2 bg-[#d6b85c]" />
                  <div className="w-2 h-2 bg-white/30" />
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                  Core_Memory_Alloc: OK
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-[#00ffff] tracking-tighter">
                  [{new Date().toISOString()}] INITIALIZING_SUBSYSTEMS...
                </div>
                <div className="text-white">
                  {'>>'} POOL_MANAGER.SPAWN_PRESET(ENEMY_POOL_v4)
                </div>
                <div className="text-white">
                  {'>>'} DATA_PIPELINE.CONNECT(BINANCE_WSS)
                </div>
                <div className="text-green-400">
                  {'>>'} CONNECTION_ESTABLISHED: LATENCY 8ms
                </div>
                <div className="text-white">
                  {'>>'} AI_DIRECTOR.LOAD_WEIGHTS(SYNAPTIC_NET)
                </div>
                <div className="text-[#d6b85c] font-bold">
                  {'>>'} STATUS: READY_FOR_DEPLOYMENT
                </div>
                <div className="mt-4 pt-4 border-t border-[#b22222]/10 flex items-center gap-4">
                  <div className="flex-1 h-1 bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full bg-[#d6b85c]"
                      animate={{ width: ['0%', '100%', '0%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                  <span className="text-[10px] text-[#d6b85c]">PROCESS: PULSE</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Engineering Excellence Section */}
      <section
        id="engine"
        className="relative z-10 py-32 border-y border-[#b22222]/10 bg-[#b22222]/[0.02]"
      >
        <div className="px-6 mx-auto max-w-7xl">
          <div className="mb-20 text-center">
            <h2 className="text-xs font-black tracking-[0.4em] uppercase text-[#d6b85c] mb-4">
              Engineering Manifesto
            </h2>
            <div className="text-4xl md:text-6xl font-black font-display uppercase italic text-white flex flex-col md:flex-row items-center justify-center gap-4">
              <span>Solo Indie</span>
              <span className="w-8 h-px bg-[#b22222] hidden md:block" />
              <span className="text-[#b22222]">Enterprise Standards</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                tag: 'MEMORY',
                title: 'O(1) POOLING',
                desc: 'Zero-allocation game loop using advanced object pooling to prevent GC spikes in high-frequency rendering.',
                icon: Cpu,
              },
              {
                tag: 'PHYSICS',
                title: 'SPATIAL GRID',
                desc: 'Custom Spatial Hashing for collision detection, ensuring O(N) complexity even with 500+ active entities.',
                icon: Shield,
              },
              {
                tag: 'STATE',
                title: 'DECOUPLED ZUSTAND',
                desc: 'Atomic state management with manual subscription control for React-safe 60FPS UI synchronization.',
                icon: Activity,
              },
              {
                tag: 'BACKEND',
                title: 'SECURE PIPELINE',
                desc: 'Supabase RLS coupled with Google App Engine microservices for bulletproof anti-cheat validation.',
                icon: Shield,
              },
            ].map((card, i) => (
              <div
                key={i}
                id={card.tag === 'BACKEND' ? 'pipeline' : undefined}
                className="group p-6 border border-white/5 bg-white/5 hover:border-[#d6b85c]/30 hover:bg-[#d6b85c]/5 transition-all"
              >
                <div className="text-[10px] font-black text-[#b22222] mb-4 font-mono tracking-widest">
                  {card.tag}
                </div>
                <h3 className="text-xl font-bold text-white mb-4 font-display italic tracking-wide group-hover:text-[#d6b85c] transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-mono">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solo Dev Logic Flow */}
      <section id="dev" className="relative z-10 py-32 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <Terminal className="text-[#d6b85c] mb-8 w-12 h-12" />
              <h3 className="text-4xl md:text-5xl font-black mb-8 font-display italic uppercase">
                Ultra-Innovative <br />
                Architecture
              </h3>
              <p className="text-slate-400 mb-8 font-mono text-sm leading-relaxed">
                As a solo indie developer, my requirement was simple: build a system
                that manages itself. The{' '}
                <span className="text-[#d6b85c] font-bold">Neural AIDirector</span>{' '}
                monitors your performance, while the
                <span className="text-[#b22222] font-bold">Market Bridge</span> adjusts
                enemy stats based on BTC volatility. No manual balance adjustments—just
                systemic intelligence.
              </p>

              <div className="flex flex-wrap gap-4">
                {[
                  'React 19',
                  'TSX Engine',
                  'Node.js',
                  'Supabase',
                  'Google Cloud',
                  'Framer Motion',
                  'Synaptic AI',
                ].map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-white/5 border border-white/10 text-[10px] uppercase font-bold text-slate-500 tracking-tighter"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-8 border-2 border-[#d6b85c]/20 bg-[#d6b85c]/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 font-mono text-[10px] text-[#d6b85c]/50">
                INTERNAL_PROTOCOL_LOG
              </div>
              <div className="space-y-4 relative z-10">
                <div className="flex gap-4 items-start">
                  <div className="w-1 h-12 bg-[#b22222]" />
                  <div>
                    <div className="text-xs font-black text-white uppercase italic">
                      Systemic Balance
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Difficulty scales automatically with Leverage (1x-100x).
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-1 h-12 bg-[#d6b85c]" />
                  <div>
                    <div className="text-xs font-black text-white uppercase italic">
                      Real-Time Integrity
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      WSS feed failover ensures zero game interruption during market
                      spikes.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-1 h-12 bg-white" />
                  <div>
                    <div className="text-xs font-black text-white uppercase italic">
                      60 FPS Native
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Canvas-optimized rendering pipeline bypasses React DOM overhead.
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative Corner */}
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#d6b85c]/20 clip-path-poly flex items-center justify-center">
                <Zap className="w-3 h-3 text-[#d6b85c]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Legal */}
      <footer className="relative z-10 py-20 px-6 border-t border-[#b22222]/20 bg-black">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
          <div>
            <div className="flex flex-col mb-6">
              <span
                className={`text-xl font-black tracking-tight uppercase font-display italic text-[#d6b85c] leading-tight ${!isRetro ? 'cyber-sway-text' : ''}`}
              >
                CRYPTO
              </span>
              <span
                className={`text-xl font-black tracking-tight uppercase font-display italic text-white -mt-1 leading-tight ${!isRetro ? 'cyber-sway-text' : ''}`}
              >
                SURVIVORS
              </span>
            </div>
            <p className="text-[10px] text-slate-600 font-mono max-w-xs uppercase tracking-widest">
              Solo indie developer project. <br />© 2026 CSYNC PROTOCOL.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 text-[10px] font-black uppercase tracking-[0.2em] font-mono text-slate-500">
            <div className="relative group/nav">
              <div className="absolute -top-4 left-0 right-0 h-[2px] bg-[#b22222] shadow-[0_0_10px_rgba(178,34,34,0.5)]" />
              <button
                onClick={onLaunch}
                className="hover:text-[#d6b85c] transition-colors"
              >
                Access_Terminal
              </button>
            </div>
            <button
              onClick={onViewPrivacy}
              className="hover:text-[#d6b85c] transition-colors"
            >
              Privacy_Doc
            </button>
            <button
              onClick={onViewTerms}
              className="hover:text-[#d6b85c] transition-colors"
            >
              Terms_Doc
            </button>
            <a
              href="mailto:info@crypto-survivors.com"
              className="hover:text-[#b22222] transition-colors"
            >
              Contact_Channel
            </a>
          </div>
        </div>
      </footer>

      {/* Floating Back to Top Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        onClick={() => {
          const topEl = document.getElementById('top');
          if (topEl) {
            topEl.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        className={`
          fixed bottom-8 right-8 z-[60] px-4 py-3 border backdrop-blur-sm transition-all shadow-lg active:scale-95 touch-manipulation
          text-sm font-cyber uppercase tracking-wider
          ${
            isRetro
              ? 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:text-white rounded-none'
              : 'bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl'
          }
        `}
        title="Back to Top"
      >
        ↑ TOP
      </motion.button>

      {/* Global Style Injection for unique animations */}
      <style>{`
        @keyframes scanline {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        .animate-scanline {
          animation: scanline 8s linear infinite;
        }
        .clip-path-poly {
          clip-path: polygon(100% 0, 100% 100%, 0 100%);
        }
        .font-display { font-family: 'Orbitron', sans-serif; }
      `}</style>
    </div>
  );
};
