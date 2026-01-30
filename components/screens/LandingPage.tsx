/**
 * LandingPage.tsx - Corporate Showcase & Engine Entry
 *
 * DESIGN MANIFESTO:
 * 1. Aesthetic: "Casino-Cyber Mix" (High-stakes luxury meets gritty cyberpunk architecture).
 * 2. Branding: Professional red accents (#b22222) vs Elite gold accents (#d6b85c).
 * 3. Typography: Orbitron for display (Headings) + Monospace for technical data.
 * 4. Architecture: Config-driven sections, pure CSS animations for landing-specific FX.
 *
 * DESIGN TOKENS:
 * - Primary Gold: #d6b85c (Trust, Reward, Rarity)
 * - Primary Red: #b22222 (Danger, High-Stakes, Action)
 * - Dark BG: #020617 (Deep Obsidian)
 * - Transition: 300ms cubic-bezier (Professional "Snap")
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Zap,
  Cpu,
  Play,
  ArrowRight,
  Terminal,
  Activity,
  Menu,
  X,
  Check,
  ChevronDown,
  Rocket,
  Gamepad2,
  Trophy,
  Sparkles,
} from 'lucide-react';
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
  const { isRetro, toggleTheme, isTransitioning } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // FAQ Data
  const faqItems = [
    {
      question: 'What makes Crypto Survivors different from other games?',
      answer:
        'Real-time BTC/USD price feeds directly influence gameplay difficulty. Market volatility creates unique challenges every session.',
    },
    {
      question: 'Is this a play-to-earn or crypto wallet game?',
      answer:
        'No. This is a skill-based arcade game. No real money, no wallets, no blockchain transactions required.',
    },
    {
      question: 'What are Casual and Competitive modes?',
      answer:
        'Casual mode offers relaxed difficulty for learning. Competitive mode features global leaderboards and anti-cheat validation.',
    },
    {
      question: 'Does the game work offline?',
      answer:
        'Limited offline mode available via PWA. Full features require internet for live market data.',
    },
    {
      question: 'What platforms are supported?',
      answer:
        'Web browser (desktop & mobile), PWA installable. Native apps planned for future releases.',
    },
  ];

  // Roadmap Data
  const roadmapItems = [
    {
      phase: 'Q1 2026',
      title: 'Foundation',
      status: 'completed',
      items: ['Core gameplay loop', '60 FPS Canvas engine', 'Supabase integration'],
    },
    {
      phase: 'Q2 2026',
      title: 'Live Markets',
      status: 'current',
      items: ['Binance/Coinbase WSS', 'Neural AI Director', 'Anti-cheat system'],
    },
    {
      phase: 'Q3 2026',
      title: 'Social',
      status: 'upcoming',
      items: ['Global leaderboards', 'Replay sharing', 'Achievement badges'],
    },
    {
      phase: 'Q4 2026',
      title: 'Expansion',
      status: 'upcoming',
      items: ['Multi-crypto support', 'Daily challenges', 'Seasonal events'],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#020617] text-white font-sans selection:bg-[#d6b85c]/30 overflow-x-hidden allow-scroll"
    >
      {/* --- 00. BACKGROUND ARCHITECTURE --- */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Ambient Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#d6b85c]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#b22222]/5 blur-[120px] rounded-full" />

        {/* Texture Overlays */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05]" />

        {/* Dynamic Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent h-[2px] w-full animate-scanline" />
      </div>
      {/* --- 01. NAVIGATION LAYER --- */}
      <nav
        id="top"
        className="relative z-50 flex items-center justify-between px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8 mx-auto max-w-7xl"
      >
        {/* Branding Sub-module */}
        <a
          href="#top"
          className="flex flex-col hover:opacity-80 transition-all duration-300 pr-4 lg:pr-24 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none"
        >
          <span
            className={`text-xl sm:text-2xl font-black tracking-tight uppercase italic text-[#d6b85c] leading-tight ${isRetro ? 'font-retro-pixel' : 'font-cyber cyber-sway-text'}`}
          >
            CRYPTO
          </span>
          <span
            className={`text-xl sm:text-2xl font-black tracking-tight uppercase italic text-white -mt-1 leading-tight ${isRetro ? 'font-retro-pixel' : 'font-cyber cyber-sway-text'}`}
          >
            SURVIVORS
          </span>
        </a>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden p-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:text-[#d6b85c] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Desktop Nav Menu */}
        <div className="hidden lg:flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] font-mono">
          {/* Theme Switch Protocol Button */}
          <div
            className={`relative group/nav border ${isRetro ? 'border-[#d6b85c] bg-[#d6b85c]/10 shadow-[4px_4px_0px_rgba(214,184,92,0.2)]' : 'border-[#d6b85c]/30 bg-black/40'} hover:border-[#d6b85c] transition-all duration-300`}
          >
            <button
              onClick={toggleTheme}
              className="px-4 py-3 min-h-[44px] text-[#d6b85c] hover:text-white transition-all duration-300 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none"
            >
              <Zap className={`w-3 h-3 ${isTransitioning ? 'animate-spin' : ''}`} />
              {isRetro ? 'PROTOCOL: CYBER' : 'PROTOCOL: RETRO'}
            </button>
          </div>

          {/* Standard Nav Links */}
          <div
            className={`relative group/nav border ${isRetro ? 'border-white/40 bg-white/5 shadow-[4px_4px_0px_rgba(255,255,255,0.1)]' : 'border-[#b22222]/30 bg-black/20'} hover:border-[#b22222] transition-all duration-300 active:scale-95`}
          >
            <a
              href="#engine"
              className="block px-4 py-3 min-h-[44px] text-slate-400 hover:text-white transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none flex items-center"
            >
              01. Engine
            </a>
          </div>
          <div
            className={`relative group/nav border ${isRetro ? 'border-white/40 bg-white/5 shadow-[4px_4px_0px_rgba(255,255,255,0.1)]' : 'border-[#b22222]/30 bg-black/20'} hover:border-[#b22222] transition-all duration-300 active:scale-95`}
          >
            <a
              href="#pipeline"
              className="block px-4 py-3 min-h-[44px] text-slate-400 hover:text-white transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none flex items-center"
            >
              02. Pipeline
            </a>
          </div>
          <div
            className={`relative group/nav border ${isRetro ? 'border-white/40 bg-white/5 shadow-[4px_4px_0px_rgba(255,255,255,0.1)]' : 'border-[#b22222]/30 bg-black/20'} hover:border-[#b22222] transition-all duration-300 active:scale-95`}
          >
            <a
              href="#dev"
              className="block px-4 py-3 min-h-[44px] text-slate-400 hover:text-white transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none flex items-center"
            >
              03. Solo Dev
            </a>
          </div>
          <div
            className={`relative group/nav border ${isRetro ? 'border-zinc-500 bg-white/5 shadow-[4px_4px_0px_rgba(255,255,255,0.1)]' : 'border-white/20 hover:border-white/40 bg-white/5'} transition-all duration-300 font-bold active:scale-95`}
          >
            <button
              id="docs-nav-link"
              onClick={() => (window.location.hash = '#docs')}
              className="px-4 py-3 min-h-[44px] text-slate-400 hover:text-white transition-all duration-300 uppercase focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none flex items-center"
            >
              04. Documentation
            </button>
          </div>

          {/* Primary Action */}
          <button
            onClick={onLaunch}
            className={`px-6 py-3 min-h-[44px] bg-[#d6b85c] text-black font-black hover:bg-white transition-all duration-300 active:scale-95 border border-[#d6b85c] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none ${
              isRetro
                ? 'shadow-[4px_4px_0px_rgba(214,184,92,0.4)]'
                : 'shadow-[0_0_20px_rgba(214,184,92,0.3)]'
            }`}
          >
            EXECUTE ENGINE
          </button>
        </div>
      </nav>

      {/* --- MOBILE MENU DRAWER --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
              className="absolute right-0 top-0 h-full w-[280px] bg-[#020617] border-l border-[#b22222]/20 p-6 flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:text-[#d6b85c] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Mobile Menu Items */}
              <div className="mt-16 flex flex-col gap-2 text-sm font-black uppercase tracking-widest font-mono">
                <button
                  onClick={toggleTheme}
                  className={`w-full p-4 min-h-[48px] text-left border transition-all duration-300 ${
                    isRetro
                      ? 'border-[#d6b85c] bg-[#d6b85c]/10 text-[#d6b85c]'
                      : 'border-[#d6b85c]/30 bg-black/40 text-[#d6b85c]'
                  } focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none flex items-center gap-3`}
                >
                  <Zap className={`w-4 h-4 ${isTransitioning ? 'animate-spin' : ''}`} />
                  {isRetro ? 'PROTOCOL: CYBER' : 'PROTOCOL: RETRO'}
                </button>

                <a
                  href="#engine"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full p-4 min-h-[48px] text-left border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-[#b22222] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none"
                >
                  01. Engine
                </a>

                <a
                  href="#pipeline"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full p-4 min-h-[48px] text-left border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-[#b22222] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none"
                >
                  02. Pipeline
                </a>

                <a
                  href="#dev"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full p-4 min-h-[48px] text-left border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-[#b22222] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none"
                >
                  03. Solo Dev
                </a>

                <button
                  onClick={() => {
                    window.location.hash = '#docs';
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full p-4 min-h-[48px] text-left border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-[#b22222] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none"
                >
                  04. Documentation
                </button>
              </div>

              {/* Mobile CTA */}
              <button
                onClick={() => {
                  onLaunch();
                  setIsMobileMenuOpen(false);
                }}
                className={`mt-auto w-full p-4 min-h-[48px] bg-[#d6b85c] text-black font-black text-center hover:bg-white transition-all duration-300 active:scale-95 border border-[#d6b85c] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none ${
                  isRetro
                    ? 'shadow-[4px_4px_0px_rgba(214,184,92,0.4)]'
                    : 'shadow-[0_0_20px_rgba(214,184,92,0.3)]'
                }`}
              >
                EXECUTE ENGINE
              </button>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
      {/* --- 02. HERO & CTA STACK --- */}
      <header className="relative z-10 px-4 sm:px-6 pt-16 sm:pt-24 pb-24 sm:pb-32 mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
          {/* Main Messaging Sub-module */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 sm:mb-8 rounded bg-[#b22222]/10 border-l-4 border-[#b22222] text-[#b22222] text-[10px] sm:text-xs font-black tracking-widest uppercase font-mono">
              SYSTEM STATUS: STANDBY_MODE (BETA_v1.0)
            </div>

            <h1
              className={`text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter mb-6 sm:mb-8 leading-[0.95] italic ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
            >
              HIGH STAKES <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d6b85c] via-[#ffd600] to-white">
                VOLATILITY
              </span>
            </h1>

            <p className="max-w-xl text-sm sm:text-base md:text-lg text-slate-400 mb-8 sm:mb-12 leading-relaxed font-mono">
              Crafting a <span className="text-[#d6b85c]">systematic bridge</span>{' '}
              between live financial markets and rogue-lite hyper-casual gameplay.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <button
                onClick={onLaunch}
                className="group relative w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-5 min-h-[48px] bg-[#d6b85c] text-black font-black text-lg sm:text-xl md:text-2xl hover:bg-[#ffd600] transition-all duration-300 hover:shadow-[0_0_40px_rgba(214,184,92,0.4)] flex items-center justify-center gap-3 active:scale-95 overflow-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <div className="absolute inset-x-0 h-[2px] bg-white opacity-20 -top-full group-hover:top-full transition-all duration-700" />
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                START SURVIVAL
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
              <a
                href="https://github.com/blntunlan/crypto-cyber-survivors"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 min-h-[48px] border transition-all duration-300 flex items-center justify-center gap-3 font-bold text-xs tracking-widest uppercase text-slate-300 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none
                  ${isRetro ? 'border-white/20 bg-white/5 shadow-[4px_4px_0px_rgba(255,255,255,0.1)] hover:bg-white/10' : 'border-[#b22222]/30 hover:bg-[#b22222]/10'}
                `}
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

          {/* Technical Terminal Sub-module */}
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
      {/* --- 03. ENGINEERING EXCELLENCE SHOWCASE --- */}
      <section
        id="engine"
        className="relative z-10 py-20 sm:py-24 lg:py-32 border-y border-[#b22222]/10 bg-[#b22222]/[0.02]"
      >
        <div className="px-4 sm:px-6 mx-auto max-w-7xl">
          <div className="mb-12 sm:mb-16 lg:mb-20 text-center">
            <h2 className="text-xs font-black tracking-[0.4em] uppercase text-[#d6b85c] mb-4">
              Engineering Manifesto
            </h2>
            <div
              className={`text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase italic text-white flex flex-col md:flex-row items-center justify-center gap-2 sm:gap-4 ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
            >
              <span>Solo Indie</span>
              <span className="w-8 h-px bg-[#b22222] hidden md:block" />
              <span className="text-[#b22222]">Enterprise Standards</span>
            </div>
          </div>

          {/* Grid Layout Sub-module */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                tag: 'MEMORY',
                title: 'O(1) POOLING',
                desc: 'Zero-allocation game loop using advanced object pooling to prevent GC spikes.',
                icon: Cpu,
              },
              {
                tag: 'PHYSICS',
                title: 'SPATIAL GRID',
                desc: 'Custom Spatial Hashing for collision detection, ensuring O(N) complexity.',
                icon: Shield,
              },
              {
                tag: 'STATE',
                title: 'DECOUPLED ZUSTAND',
                desc: 'Atomic state management with manual subscription control for 60FPS sync.',
                icon: Activity,
              },
              {
                tag: 'BACKEND',
                title: 'SECURE PIPELINE',
                desc: 'Supabase RLS coupled with Edge Functions for bulletproof validation.',
                icon: Shield,
              },
            ].map((card, i) => (
              <div
                key={i}
                id={card.tag === 'BACKEND' ? 'pipeline' : undefined}
                className={`group p-4 sm:p-6 border transition-all duration-300 active:scale-[0.98] focus-within:ring-2 focus-within:ring-[#d6b85c]
                  ${
                    isRetro
                      ? 'border-white/10 bg-white/5 shadow-[4px_4px_0px_rgba(255,255,255,0.05)] hover:shadow-[6px_6px_0px_rgba(214,184,92,0.15)] hover:border-[#d6b85c]/40'
                      : 'border-white/5 bg-white/5 hover:border-[#d6b85c]/30 hover:bg-[#d6b85c]/5 hover:scale-[1.02]'
                  }
                `}
              >
                <div className="text-[10px] font-black text-[#b22222] mb-3 sm:mb-4 font-mono tracking-widest">
                  {card.tag}
                </div>
                <h3
                  className={`text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 italic tracking-wide group-hover:text-[#d6b85c] transition-all duration-300 ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
                >
                  {card.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed font-mono min-h-[48px]">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* --- 04. SOLO DEV ARCHITECTURE FLOW --- */}
      <section id="dev" className="relative z-10 py-20 sm:py-24 lg:py-32 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Descriptive Content */}
            <div>
              <Terminal className="text-[#d6b85c] mb-6 sm:mb-8 w-10 h-10 sm:w-12 sm:h-12" />
              <h3
                className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-6 sm:mb-8 italic uppercase ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
              >
                Ultra-Innovative Architecture
              </h3>
              <p className="text-slate-400 mb-6 sm:mb-8 font-mono text-sm leading-relaxed">
                As a solo indie developer, my requirement was simple: build a system
                that manages itself.
              </p>

              <div className="flex flex-wrap gap-2 sm:gap-4">
                {[
                  'React 19',
                  'TSX Engine',
                  'Supabase',
                  'Framer Motion',
                  'Synaptic AI',
                ].map(tag => (
                  <span
                    key={tag}
                    className="px-2 sm:px-3 py-1 bg-white/5 border border-white/10 text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-tighter"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Visual Logic Diagram Sub-module */}
            <div className="p-6 sm:p-8 border-2 border-[#d6b85c]/20 bg-[#d6b85c]/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 sm:p-4 font-mono text-[10px] text-[#d6b85c]/50">
                INTERNAL_PROTOCOL_LOG
              </div>
              <div className="space-y-4 relative z-10">
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="w-1 h-12 bg-[#b22222] flex-shrink-0" />
                  <div>
                    <div className="text-xs font-black text-white uppercase italic">
                      Systemic Balance
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Difficulty scales automatically with Leverage (1x-100x).
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="w-1 h-12 bg-[#d6b85c] flex-shrink-0" />
                  <div>
                    <div className="text-xs font-black text-white uppercase italic">
                      Real-Time Integrity
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      WSS feed failover ensures zero game interruption.
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="w-1 h-12 bg-white flex-shrink-0" />
                  <div>
                    <div className="text-xs font-black text-white uppercase italic">
                      60 FPS Native
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Canvas-optimized rendering pipeline bypasses DOM overhead.
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#d6b85c]/20 clip-path-poly flex items-center justify-center">
                <Zap className="w-3 h-3 text-[#d6b85c]" />
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* --- 05. FEATURE COMPARISON --- */}
      <section className="relative z-10 py-20 sm:py-24 lg:py-32 px-4 sm:px-6 border-t border-[#b22222]/10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 sm:mb-16 text-center">
            <h2 className="text-xs font-black tracking-[0.4em] uppercase text-[#d6b85c] mb-4">
              Choose Your Path
            </h2>
            <div
              className={`text-2xl sm:text-4xl md:text-5xl font-black uppercase italic text-white ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
            >
              Game Modes
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {/* Casual Mode */}
            <div
              className={`p-6 sm:p-8 border-2 transition-all duration-300 ${
                isRetro
                  ? 'border-[#d6b85c]/30 bg-[#d6b85c]/5 shadow-[6px_6px_0px_rgba(214,184,92,0.1)]'
                  : 'border-[#d6b85c]/20 bg-gradient-to-br from-[#d6b85c]/10 to-transparent'
              }`}
            >
              <div className="flex items-center gap-3 mb-6">
                <Gamepad2 className="w-8 h-8 text-[#d6b85c]" />
                <h3
                  className={`text-xl sm:text-2xl font-black uppercase italic text-[#d6b85c] ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
                >
                  Casual
                </h3>
              </div>
              <p className="text-slate-400 text-sm font-mono mb-6">
                Perfect for learning mechanics and enjoying relaxed gameplay.
              </p>
              <ul className="space-y-3">
                {[
                  'Forgiving difficulty curve',
                  'Practice without pressure',
                  'All features unlocked',
                  'Local progress saving',
                  'Offline mode available',
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm text-slate-300"
                  >
                    <Check className="w-4 h-4 text-[#d6b85c] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Competitive Mode */}
            <div
              className={`p-6 sm:p-8 border-2 transition-all duration-300 relative overflow-hidden ${
                isRetro
                  ? 'border-[#b22222]/30 bg-[#b22222]/5 shadow-[6px_6px_0px_rgba(178,34,34,0.1)]'
                  : 'border-[#b22222]/20 bg-gradient-to-br from-[#b22222]/10 to-transparent'
              }`}
            >
              <div className="absolute top-4 right-4 px-2 py-1 bg-[#b22222] text-[9px] font-black uppercase tracking-wider">
                Pro
              </div>
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-8 h-8 text-[#b22222]" />
                <h3
                  className={`text-xl sm:text-2xl font-black uppercase italic text-[#b22222] ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
                >
                  Competitive
                </h3>
              </div>
              <p className="text-slate-400 text-sm font-mono mb-6">
                Prove your skills on the global stage with verified runs.
              </p>
              <ul className="space-y-3">
                {[
                  'Global leaderboards',
                  'Anti-cheat validation',
                  'Replay recording',
                  'Achievement tracking',
                  'Seasonal rankings',
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm text-slate-300"
                  >
                    <Check className="w-4 h-4 text-[#b22222] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- 06. ROADMAP --- */}
      <section className="relative z-10 py-20 sm:py-24 lg:py-32 px-4 sm:px-6 border-t border-[#b22222]/10 bg-[#b22222]/[0.02]">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 sm:mb-16 text-center">
            <h2 className="text-xs font-black tracking-[0.4em] uppercase text-[#d6b85c] mb-4">
              Development Timeline
            </h2>
            <div
              className={`text-2xl sm:text-4xl md:text-5xl font-black uppercase italic text-white ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
            >
              Roadmap
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roadmapItems.map((phase, i) => (
              <div
                key={i}
                className={`p-5 sm:p-6 border transition-all duration-300 relative ${
                  phase.status === 'current'
                    ? isRetro
                      ? 'border-[#d6b85c] bg-[#d6b85c]/10 shadow-[4px_4px_0px_rgba(214,184,92,0.2)]'
                      : 'border-[#d6b85c]/50 bg-[#d6b85c]/5 shadow-[0_0_20px_rgba(214,184,92,0.1)]'
                    : phase.status === 'completed'
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-white/10 bg-white/5'
                }`}
              >
                {phase.status === 'current' && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#d6b85c] text-black text-[8px] font-black uppercase">
                    Active
                  </div>
                )}
                <div
                  className={`text-[10px] font-black tracking-widest mb-2 ${
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
                  className={`text-lg font-bold mb-4 italic ${
                    phase.status === 'current'
                      ? 'text-[#d6b85c]'
                      : phase.status === 'completed'
                        ? 'text-green-400'
                        : 'text-white'
                  } ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
                >
                  {phase.title}
                </h3>
                <ul className="space-y-2">
                  {phase.items.map((item, j) => (
                    <li
                      key={j}
                      className={`text-[11px] font-mono flex items-start gap-2 ${
                        phase.status === 'completed'
                          ? 'text-slate-500 line-through'
                          : 'text-slate-400'
                      }`}
                    >
                      {phase.status === 'completed' ? (
                        <Check className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : phase.status === 'current' ? (
                        <Sparkles className="w-3 h-3 text-[#d6b85c] flex-shrink-0 mt-0.5" />
                      ) : (
                        <Rocket className="w-3 h-3 text-slate-600 flex-shrink-0 mt-0.5" />
                      )}
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- 07. FAQ ACCORDION --- */}
      <section className="relative z-10 py-20 sm:py-24 lg:py-32 px-4 sm:px-6 border-t border-[#b22222]/10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 sm:mb-16 text-center">
            <h2 className="text-xs font-black tracking-[0.4em] uppercase text-[#d6b85c] mb-4">
              Common Questions
            </h2>
            <div
              className={`text-2xl sm:text-4xl md:text-5xl font-black uppercase italic text-white ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
            >
              FAQ
            </div>
          </div>

          <div className="space-y-3">
            {faqItems.map((faq, i) => (
              <div
                key={i}
                className={`border transition-all duration-300 ${
                  openFaqIndex === i
                    ? isRetro
                      ? 'border-[#d6b85c]/50 bg-[#d6b85c]/5 shadow-[4px_4px_0px_rgba(214,184,92,0.1)]'
                      : 'border-[#d6b85c]/30 bg-[#d6b85c]/5'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none"
                >
                  <span
                    className={`text-sm sm:text-base font-bold ${openFaqIndex === i ? 'text-[#d6b85c]' : 'text-white'}`}
                  >
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${
                      openFaqIndex === i
                        ? 'rotate-180 text-[#d6b85c]'
                        : 'text-slate-500'
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaqIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-slate-400 font-mono leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- 08. FOOTER & LEGAL --- */}
      <footer className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 border-t border-[#b22222]/20 bg-black">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8 sm:gap-12">
          {/* Logo & Trademark */}
          <div>
            <div className="flex flex-col mb-4 sm:mb-6">
              <span
                className={`text-lg sm:text-xl font-black tracking-tight uppercase italic text-[#d6b85c] leading-tight ${isRetro ? 'font-retro-pixel' : 'font-cyber cyber-sway-text'}`}
              >
                CRYPTO
              </span>
              <span
                className={`text-lg sm:text-xl font-black tracking-tight uppercase italic text-white -mt-1 leading-tight ${isRetro ? 'font-retro-pixel' : 'font-cyber cyber-sway-text'}`}
              >
                SURVIVORS
              </span>
            </div>
            <p className="text-[10px] text-slate-600 font-mono max-w-xs uppercase tracking-widest mb-4">
              Solo indie developer project. <br />© 2026 CSYNC PROTOCOL.
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              {/* Discord - TODO: Replace with real link */}
              <a
                href="#"
                onClick={e => {
                  e.preventDefault();
                  alert('Discord link coming soon!');
                }}
                className={`p-2 border transition-all duration-300 hover:scale-110 ${
                  isRetro
                    ? 'border-[#5865F2]/30 hover:border-[#5865F2] hover:bg-[#5865F2]/10'
                    : 'border-white/10 hover:border-[#5865F2] hover:bg-[#5865F2]/10'
                }`}
                aria-label="Discord (Coming Soon)"
              >
                <svg
                  className="w-4 h-4 text-[#5865F2]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
              {/* Twitter/X - TODO: Replace with real link */}
              <a
                href="#"
                onClick={e => {
                  e.preventDefault();
                  alert('Twitter/X link coming soon!');
                }}
                className={`p-2 border transition-all duration-300 hover:scale-110 ${
                  isRetro
                    ? 'border-white/30 hover:border-white hover:bg-white/10'
                    : 'border-white/10 hover:border-white hover:bg-white/10'
                }`}
                aria-label="Twitter/X (Coming Soon)"
              >
                <svg
                  className="w-4 h-4 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Regulatory Navigation */}
          <div className="flex flex-wrap gap-3 sm:gap-4 lg:gap-8 text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] font-mono text-slate-500">
            <div
              className={`relative group/nav border ${isRetro ? 'border-[#b22222]/30 shadow-[4px_4px_0px_rgba(178,34,34,0.1)]' : 'border-[#b22222]/30'} hover:border-[#b22222] transition-all duration-300 active:scale-95`}
            >
              <button
                onClick={onLaunch}
                className="px-3 sm:px-4 py-2 sm:py-3 min-h-[44px] hover:text-[#d6b85c] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none flex items-center"
              >
                Access_Terminal
              </button>
            </div>
            <div
              className={`relative group/nav border ${isRetro ? 'border-white/10 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]' : 'border-white/10'} hover:border-white transition-all duration-300 active:scale-95`}
            >
              <button
                onClick={onViewPrivacy}
                className="px-3 sm:px-4 py-2 sm:py-3 min-h-[44px] hover:text-white transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none flex items-center"
              >
                Privacy_Doc
              </button>
            </div>
            <div
              className={`relative group/nav border ${isRetro ? 'border-white/10 shadow-[4px_4px_0px_rgba(255,255,255,0.05)]' : 'border-white/10'} hover:border-white transition-all duration-300 active:scale-95`}
            >
              <button
                onClick={onViewTerms}
                className="px-3 sm:px-4 py-2 sm:py-3 min-h-[44px] hover:text-white transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none flex items-center"
              >
                Terms_Doc
              </button>
            </div>
            <div
              className={`relative group/nav border border-[#b22222]/20 hover:border-[#b22222] transition-all duration-300 active:scale-95`}
            >
              <a
                href="mailto:info@crypto-survivors.com"
                className="px-3 sm:px-4 py-2 sm:py-3 min-h-[44px] hover:text-[#b22222] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none flex items-center"
              >
                Contact_Channel
              </a>
            </div>
          </div>
        </div>
      </footer>
      {/* Utilities: Back to Top */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        onClick={() => {
          const topEl = document.getElementById('top');
          if (topEl) topEl.scrollIntoView({ behavior: 'smooth' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className={`fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[60] px-3 sm:px-4 py-2 sm:py-3 min-h-[44px] min-w-[44px] border backdrop-blur-sm transition-all duration-300 shadow-lg active:scale-95 touch-manipulation
          text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center
          focus-visible:ring-2 focus-visible:ring-[#d6b85c] focus-visible:outline-none
          ${
            isRetro
              ? 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:text-white rounded-none shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
              : 'bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]'
          }
        `}
        title="Back to Top"
        style={{ bottom: 'calc(1rem + var(--sab, 0px))', right: '1rem' }}
      >
        ↑ TOP
      </motion.button>
      {/* --- 06. GLOBAL STYLE INJECTIONS --- */}
      <style>{`
        @keyframes scanline { 0% { top: -10%; } 100% { top: 110%; } }
        .animate-scanline { animation: scanline 8s linear infinite; }
        .clip-path-poly { clip-path: polygon(100% 0, 100% 100%, 0 100%); }
        .font-display { font-family: 'Orbitron', sans-serif; }
      `}</style>
    </motion.div>
  );
};
