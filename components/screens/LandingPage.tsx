import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Zap,
  Cpu,
  Github,
  Play,
  ArrowRight,
  TrendingUp,
  Terminal,
  Activity,
} from 'lucide-react';

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
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-[#d6b85c]/30 overflow-x-hidden">
      {/* Background Effects - Casino Cyber Mix */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#d6b85c]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#b22222]/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05]" />

        {/* Animated Scanlines */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent h-[2px] w-full animate-scanline" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-8 mx-auto max-w-7xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-[#d6b85c] to-[#b22222] rounded-lg shadow-lg shadow-[#d6b85c]/20">
            <TrendingUp className="w-6 h-6 text-black" />
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase font-display italic text-[#d6b85c]">
            CRYPTO <span className="text-white">SURVIVORS</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest font-mono text-slate-400">
          <a
            href="#engine"
            className="hover:text-[#d6b85c] transition-colors line-through decoration-[#b22222]/50 decoration-2"
          >
            01. Engine
          </a>
          <a
            href="#pipeline"
            className="hover:text-[#d6b85c] transition-colors line-through decoration-[#b22222]/50 decoration-2"
          >
            02. Data Pipeline
          </a>
          <a
            href="#dev"
            className="hover:text-[#d6b85c] transition-colors line-through decoration-[#b22222]/50 decoration-2"
          >
            03. Solo Dev
          </a>
          <button
            onClick={onLaunch}
            className="px-6 py-2 border-2 border-[#d6b85c] text-[#d6b85c] font-black rounded hover:bg-[#d6b85c] hover:text-black transition-all active:scale-95"
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
                <Github className="w-5 h-5" />
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
                icon: Lock,
              },
            ].map((card, i) => (
              <div
                key={i}
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
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-[#d6b85c]" />
              <span className="text-xl font-black font-display italic tracking-tight uppercase text-[#d6b85c]">
                CRYPTO{' '}
                <span className="text-white font-mono tracking-tighter shadow-sm shadow-[#d6b85c]">
                  SURVIVORS
                </span>
              </span>
            </div>
            <p className="text-[10px] text-slate-600 font-mono max-w-xs uppercase tracking-widest">
              Solo indie developer project. <br />
              Powered by Google Cloud Infrastructure. <br />© 2026 CSYNC PROTOCOL.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 text-[10px] font-black uppercase tracking-[0.2em] font-mono text-slate-500">
            <button
              onClick={onLaunch}
              className="hover:text-[#d6b85c] transition-colors line-through decoration-[#b22222]/50 decoration-2"
            >
              Access_Terminal
            </button>
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
              href="mailto:dev@crypto-survivors.com"
              className="hover:text-[#b22222] transition-colors"
            >
              Contact_Channel
            </a>
          </div>
        </div>
      </footer>

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

// Internal icon for Lockdown
const Lock = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);
