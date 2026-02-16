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

import React, { useState, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useInView,
  animate,
  type Variants,
} from 'framer-motion';
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
  Users,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/useTheme';
import { type Language } from '../../contexts/LanguageConstants';

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: MOTION_EASE },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

// =============================================================================
// ANIMATED COUNTER COMPONENT
// =============================================================================

interface AnimatedCounterProps {
  from: number;
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  from,
  to,
  duration = 2,
  suffix = '',
  prefix = '',
}) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(nodeRef, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!inView || !nodeRef.current) return;

    const controls = animate(from, to, {
      duration,
      ease: 'easeOut',
      onUpdate: value => {
        if (nodeRef.current) {
          nodeRef.current.textContent = `${prefix}${Math.floor(value).toLocaleString()}${suffix}`;
        }
      },
    });

    return () => controls.stop();
  }, [inView, from, to, duration, suffix, prefix]);

  return (
    <span ref={nodeRef}>
      {prefix}
      {from}
      {suffix}
    </span>
  );
};

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
  const { t, language, setLanguage } = useLanguage();
  const { isRetro } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const originalLanguageRef = useRef<Language>(language);

  useEffect(() => {
    originalLanguageRef.current = language;
    if (language !== 'en') {
      setLanguage('en');
    }

    return () => {
      const originalLanguage = originalLanguageRef.current;
      if (originalLanguage !== 'en') {
        setLanguage(originalLanguage);
      }
    };
    // Landing is intentionally forced to English while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = (key: string): string[] =>
    t(key)
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean);
  const navLabel = (key: string): string =>
    t(key)
      .replace(/^\s*\d+\.\s*/, '')
      .trim();
  const framedNavButtonClass =
    'group relative flex h-12 items-center justify-center overflow-hidden whitespace-nowrap px-3 xl:px-4 text-slate-300 transition-all duration-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c]';
  const navAccentLineClass =
    'pointer-events-none absolute bottom-[7px] left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#d6b85c]/55 to-transparent opacity-80 transition-all duration-300 group-hover:via-[#ffd86a] group-hover:opacity-100';
  const desktopNavLabelClass = isRetro
    ? 'font-retro-pixel text-[10px] tracking-[0.12em]'
    : 'font-cyber text-[13px] tracking-[0.09em]';
  const desktopCtaClass = isRetro
    ? 'font-retro-pixel text-[10px] tracking-[0.1em]'
    : 'font-cyber text-[13px] tracking-[0.11em]';

  // FAQ Data from Translations
  const faqItems = [
    { question: t('landing.faq.q1'), answer: t('landing.faq.a1') },
    { question: t('landing.faq.q2'), answer: t('landing.faq.a2') },
    { question: t('landing.faq.q3'), answer: t('landing.faq.a3') },
    { question: t('landing.faq.q4'), answer: t('landing.faq.a4') },
    { question: t('landing.faq.q5'), answer: t('landing.faq.a5') },
  ];

  // Roadmap Data from Translations
  const roadmapItems = [
    {
      phase: t('landing.roadmap.phase1'),
      title: t('landing.roadmap.phase1_title'),
      status: 'completed',
      items: list('landing.roadmap.phase1_items'),
    },
    {
      phase: t('landing.roadmap.phase2'),
      title: t('landing.roadmap.phase2_title'),
      status: 'current',
      items: list('landing.roadmap.phase2_items'),
    },
    {
      phase: t('landing.roadmap.phase3'),
      title: t('landing.roadmap.phase3_title'),
      status: 'upcoming',
      items: list('landing.roadmap.phase3_items'),
    },
    {
      phase: t('landing.roadmap.phase4'),
      title: t('landing.roadmap.phase4_title'),
      status: 'upcoming',
      items: list('landing.roadmap.phase4_items'),
    },
  ];
  const casualModeItems = list('landing.modes.casual_items');
  const competitiveModeItems = list('landing.modes.comp_items');
  const technologyHighlights = [
    {
      title: 'C-SYNC Protocol',
      description:
        'A deterministic event contract that maps market ticks into gameplay-safe signals.',
      badge: 'SYNC CORE',
    },
    {
      title: 'Real-Time WebSocket Fabric',
      description:
        'Dual exchange streams (Binance + Coinbase) with failover and continuity guards.',
      badge: 'LIVE DATA',
    },
    {
      title: 'Neural AI Director',
      description:
        'A neural difficulty layer that evaluates market and player telemetry every cycle.',
      badge: 'ADAPTIVE AI',
    },
  ];
  const teamMembers = [
    {
      name: 'Bulent Unalan',
      role: 'Lead Architect & Founder',
      summary:
        'Owns engine architecture, C-SYNC protocol design, and end-to-end performance discipline.',
      proof: 'Company profile: Crypto Survivors',
    },
    {
      name: 'Core Contributors',
      role: 'Engine, QA, and Infrastructure',
      summary:
        'Contributors focused on gameplay systems, anti-cheat, CI quality gates, and deployment reliability.',
      proof: 'Public contribution log available on GitHub',
    },
    {
      name: 'Market & Operations Support',
      role: 'Data Pipeline and Product Ops',
      summary:
        'Supports market feed resilience, production monitoring, and release operations for the live runtime.',
      proof: 'Verification references maintained in company records',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="allow-scroll min-h-screen overflow-x-hidden bg-[#020617] font-sans text-white selection:bg-[#d6b85c]/30"
    >
      {/* --- 00. BACKGROUND ARCHITECTURE --- */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-[#d6b85c]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-[#b22222]/5 blur-[120px]" />

        {/* Texture Overlays */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05]" />

        {/* Dynamic Effects */}
        <div className="animate-scanline absolute inset-0 h-[2px] w-full bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />
      </div>
      {/* --- 01. NAVIGATION LAYER --- */}
      <nav
        id="top"
        className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-6"
      >
        {/* Branding Sub-module */}
        <a
          href="#top"
          className="flex flex-col pr-4 transition-all duration-300 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c] lg:pr-0"
        >
          <span
            className={`text-xl font-black uppercase italic leading-tight tracking-tight text-[#d6b85c] sm:text-2xl ${isRetro ? 'font-retro-pixel' : 'cyber-sway-text font-cyber'}`}
          >
            CRYPTO
          </span>
          <span
            className={`-mt-1 text-xl font-black uppercase italic leading-tight tracking-tight text-white sm:text-2xl ${isRetro ? 'font-retro-pixel' : 'cyber-sway-text font-cyber'}`}
          >
            SURVIVORS
          </span>
        </a>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center p-3 text-white transition-all duration-300 hover:text-[#d6b85c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c] lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Desktop Nav Menu */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 lg:flex xl:gap-3">
          {/* Navigation Links */}
          <a href="#engine" className={`${framedNavButtonClass} w-[108px]`}>
            <span className={desktopNavLabelClass}>
              {navLabel('landing.nav.engine')}
            </span>
            <span className={navAccentLineClass} />
          </a>
          <a href="#pipeline" className={`${framedNavButtonClass} w-[118px]`}>
            <span className={desktopNavLabelClass}>
              {navLabel('landing.nav.pipeline')}
            </span>
            <span className={navAccentLineClass} />
          </a>
          <a href="#dev" className={`${framedNavButtonClass} w-[120px]`}>
            <span className={desktopNavLabelClass}>{navLabel('landing.nav.dev')}</span>
            <span className={navAccentLineClass} />
          </a>
          <a href="#team" className={`${framedNavButtonClass} w-[96px]`}>
            <span className={desktopNavLabelClass}>TEAM</span>
            <span className={navAccentLineClass} />
          </a>
          <button
            id="docs-nav-link"
            onClick={() => (window.location.hash = '#docs')}
            className={`${framedNavButtonClass} w-[146px]`}
          >
            <span className={desktopNavLabelClass}>{navLabel('landing.nav.docs')}</span>
            <span className={navAccentLineClass} />
          </button>
        </div>
        {/* Desktop CTA */}
        <button
          onClick={onLaunch}
          className={`hidden h-12 min-w-[182px] items-center justify-center bg-gradient-to-r from-[#d6b85c] to-[#c9a94e] px-7 font-black uppercase text-black shadow-[0_0_20px_rgba(214,184,92,0.3)] transition-all duration-300 hover:from-white hover:to-white hover:shadow-[0_0_30px_rgba(214,184,92,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:flex ${desktopCtaClass}`}
        >
          {t('landing.nav.execute')}
        </button>
      </nav>

      {/* --- MOBILE MENU DRAWER --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
              className="absolute right-0 top-0 flex h-full w-[280px] flex-col border-l border-[#b22222]/20 bg-[#020617] p-6"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute right-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center p-3 text-white transition-all duration-300 hover:text-[#d6b85c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c]"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Mobile Menu Items */}
              <div className="mt-16 flex flex-col gap-2 font-mono text-sm font-black uppercase tracking-widest">
                <a
                  href="#engine"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="group relative min-h-[48px] w-full overflow-hidden border border-white/10 bg-white/5 p-4 text-left text-slate-300 transition-all duration-300 hover:border-[#b22222] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c]"
                >
                  <span>{navLabel('landing.nav.engine')}</span>
                  <span className="pointer-events-none absolute bottom-[8px] left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#d6b85c]/45 to-transparent opacity-70 transition-all duration-300 group-hover:via-[#d6b85c]" />
                </a>

                <a
                  href="#pipeline"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="group relative min-h-[48px] w-full overflow-hidden border border-white/10 bg-white/5 p-4 text-left text-slate-300 transition-all duration-300 hover:border-[#b22222] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c]"
                >
                  <span>{navLabel('landing.nav.pipeline')}</span>
                  <span className="pointer-events-none absolute bottom-[8px] left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#d6b85c]/45 to-transparent opacity-70 transition-all duration-300 group-hover:via-[#d6b85c]" />
                </a>

                <a
                  href="#dev"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="group relative min-h-[48px] w-full overflow-hidden border border-white/10 bg-white/5 p-4 text-left text-slate-300 transition-all duration-300 hover:border-[#b22222] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c]"
                >
                  <span>{navLabel('landing.nav.dev')}</span>
                  <span className="pointer-events-none absolute bottom-[8px] left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#d6b85c]/45 to-transparent opacity-70 transition-all duration-300 group-hover:via-[#d6b85c]" />
                </a>
                <a
                  href="#team"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="group relative min-h-[48px] w-full overflow-hidden border border-white/10 bg-white/5 p-4 text-left text-slate-300 transition-all duration-300 hover:border-[#b22222] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c]"
                >
                  <span>TEAM</span>
                  <span className="pointer-events-none absolute bottom-[8px] left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#d6b85c]/45 to-transparent opacity-70 transition-all duration-300 group-hover:via-[#d6b85c]" />
                </a>

                <button
                  onClick={() => {
                    window.location.hash = '#docs';
                    setIsMobileMenuOpen(false);
                  }}
                  className="group relative min-h-[48px] w-full overflow-hidden border border-white/10 bg-white/5 p-4 text-left text-slate-300 transition-all duration-300 hover:border-[#b22222] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c]"
                >
                  <span>{navLabel('landing.nav.docs')}</span>
                  <span className="pointer-events-none absolute bottom-[8px] left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#d6b85c]/45 to-transparent opacity-70 transition-all duration-300 group-hover:via-[#d6b85c]" />
                </button>
              </div>

              {/* Mobile CTA */}
              <button
                onClick={() => {
                  onLaunch();
                  setIsMobileMenuOpen(false);
                }}
                className={`mt-auto min-h-[48px] w-full border border-[#d6b85c] bg-[#d6b85c] p-4 text-center font-black text-black transition-all duration-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95 ${
                  isRetro
                    ? 'shadow-[4px_4px_0px_rgba(214,184,92,0.4)]'
                    : 'shadow-[0_0_20px_rgba(214,184,92,0.3)]'
                }`}
              >
                {t('landing.nav.execute')}
              </button>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
      {/* --- 02. HERO & CTA STACK --- */}
      <header className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pb-32 sm:pt-24">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Main Messaging Sub-module */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded border-l-4 border-[#b22222] bg-[#b22222]/10 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-[#b22222] sm:mb-8 sm:text-xs">
              {t('landing.hero.status')}
            </div>

            <h1
              className={`mb-6 text-3xl font-black italic leading-[0.95] tracking-tighter sm:mb-8 sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
            >
              <span className="mb-4 block font-mono text-xs not-italic tracking-[0.5em] text-[#d6b85c] sm:text-sm">
                CRYPTO SURVIVORS
              </span>
              {t('landing.hero.title_top')} <br />
              <span className="bg-gradient-to-r from-[#d6b85c] via-[#ffd600] to-white bg-clip-text text-transparent">
                {t('landing.hero.title_highlight')}
              </span>
            </h1>

            <p className="mb-8 max-w-xl font-mono text-sm leading-relaxed text-slate-400 sm:mb-12 sm:text-base md:text-lg">
              {t('landing.hero.description')}
            </p>

            <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
              <button
                onClick={onLaunch}
                className="group relative flex min-h-[48px] w-full items-center justify-center gap-3 overflow-hidden bg-[#d6b85c] px-6 py-4 text-lg font-black text-black transition-all duration-300 hover:bg-[#ffd600] hover:shadow-[0_0_40px_rgba(214,184,92,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95 sm:w-auto sm:px-10 sm:py-5 sm:text-xl md:text-2xl"
              >
                <div className="absolute inset-x-0 -top-full h-[2px] bg-white opacity-20 transition-all duration-700 group-hover:top-full" />
                <Play className="h-5 w-5 fill-current sm:h-6 sm:w-6" />
                {t('landing.hero.start')}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 sm:h-5 sm:w-5" />
              </button>
              <a
                href="https://github.com/blntunlan/crypto-cyber-survivors"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex min-h-[48px] w-full items-center justify-center gap-3 border px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-300 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c] sm:w-auto sm:px-8 sm:py-5
                  ${isRetro ? 'border-white/20 bg-white/5 shadow-[4px_4px_0px_rgba(255,255,255,0.1)] hover:bg-white/10' : 'border-[#b22222]/30 hover:bg-[#b22222]/10'}
                `}
              >
                <svg
                  className="h-5 w-5 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                {t('landing.hero.inspect')}
              </a>
            </div>
          </motion.div>

          {/* Technical Terminal Sub-module */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="w-full max-w-lg flex-1 lg:max-w-none"
          >
            <div className="relative rounded-sm border-2 border-[#b22222]/30 bg-black p-6 font-mono text-sm leading-snug shadow-[0_0_50px_rgba(178,34,34,0.1)]">
              <div className="mb-4 flex items-center justify-between border-b border-[#b22222]/20 pb-2">
                <div className="flex gap-2">
                  <div className="h-2 w-2 bg-[#b22222]" />
                  <div className="h-2 w-2 bg-[#d6b85c]" />
                  <div className="h-2 w-2 bg-white/30" />
                </div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500">
                  Core_Memory_Alloc: OK
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="tracking-tighter text-[#00ffff]">
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
                <div className="font-bold text-[#d6b85c]">
                  {'>>'} STATUS: READY_FOR_DEPLOYMENT
                </div>
                <div className="mt-4 flex items-center gap-4 border-t border-[#b22222]/10 pt-4">
                  <div className="h-1 flex-1 overflow-hidden bg-white/5">
                    <motion.div
                      className="h-full bg-[#d6b85c]"
                      animate={{ width: ['0%', '100%', '0%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                  <span className="text-[10px] text-[#d6b85c]">
                    PROCESS: {t('landing.terminal.process_pulse')}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* --- STATS COUNTER SECTION --- */}
      <section className="relative z-10 border-b border-[#b22222]/10 bg-gradient-to-b from-transparent to-[#b22222]/[0.02] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4"
          >
            {[
              {
                value: 2100,
                suffix: '+',
                label: t('landing.stats.tests_passing'),
                icon: Check,
                color: '#22c55e',
              },
              {
                value: 42,
                suffix: '+',
                label: t('landing.stats.singleton_services'),
                icon: Cpu,
                color: '#d6b85c',
              },
              {
                value: 60,
                suffix: ' FPS',
                label: t('landing.stats.target_performance'),
                icon: Zap,
                color: '#00ffff',
              },
              {
                value: 90,
                suffix: '+',
                label: t('landing.stats.event_types'),
                icon: Activity,
                color: '#b22222',
              },
            ].map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className={`group relative border p-6 transition-all duration-500 hover:scale-105 sm:p-8
                  ${
                    isRetro
                      ? 'border-white/20 bg-black/40 shadow-[4px_4px_0px_rgba(255,255,255,0.1)] hover:shadow-[6px_6px_0px_rgba(214,184,92,0.2)]'
                      : 'border-[#b22222]/20 bg-black/60 hover:border-[#d6b85c]/40'
                  }`}
              >
                <div className="absolute right-4 top-4 opacity-20 transition-opacity group-hover:opacity-40">
                  <stat.icon className="h-8 w-8" style={{ color: stat.color }} />
                </div>
                <div className="mb-2 text-3xl font-black text-white sm:text-4xl lg:text-5xl">
                  <AnimatedCounter
                    from={0}
                    to={stat.value}
                    suffix={stat.suffix}
                    duration={2.5}
                  />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 sm:text-sm">
                  {stat.label}
                </div>
                <div
                  className="absolute bottom-0 left-0 h-1 w-0 transition-all duration-500 group-hover:w-full"
                  style={{ background: stat.color }}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* --- 03. ENGINEERING EXCELLENCE SHOWCASE --- */}
      <section
        id="engine"
        className="relative z-10 border-y border-[#b22222]/10 bg-[#b22222]/[0.02] py-20 sm:py-24 lg:py-32"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="mb-12 text-center sm:mb-16 lg:mb-20"
          >
            <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
              {t('landing.manifesto.title')}
            </h2>
            <div
              className={`flex flex-col items-center justify-center gap-2 text-2xl font-black uppercase italic text-white sm:gap-4 sm:text-4xl md:flex-row md:text-5xl lg:text-6xl ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
            >
              <span>{t('landing.manifesto.solo')}</span>
              <span className="hidden h-px w-8 bg-[#b22222] md:block" />
              <span className="text-[#b22222]">
                {t('landing.manifesto.enterprise')}
              </span>
            </div>
          </motion.div>

          {/* Grid Layout Sub-module */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
          >
            {[
              {
                tag: t('landing.features.tag_memory'),
                title: t('landing.features.title_memory'),
                desc: t('landing.features.desc_memory'),
                icon: Cpu,
              },
              {
                tag: t('landing.features.tag_physics'),
                title: t('landing.features.title_physics'),
                desc: t('landing.features.desc_physics'),
                icon: Shield,
              },
              {
                tag: t('landing.features.tag_state'),
                title: t('landing.features.title_state'),
                desc: t('landing.features.desc_state'),
                icon: Activity,
              },
              {
                tag: t('landing.features.tag_backend'),
                title: t('landing.features.title_backend'),
                desc: t('landing.features.desc_backend'),
                icon: Shield,
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                id={card.tag === 'BACKEND' ? 'pipeline' : undefined}
                className={`group border p-4 transition-all duration-300 focus-within:ring-2 focus-within:ring-[#d6b85c] active:scale-[0.98] sm:p-6
                  ${
                    isRetro
                      ? 'border-white/10 bg-white/5 shadow-[4px_4px_0px_rgba(255,255,255,0.05)] hover:border-[#d6b85c]/40 hover:shadow-[6px_6px_0px_rgba(214,184,92,0.15)]'
                      : 'border-white/5 bg-white/5 hover:scale-[1.02] hover:border-[#d6b85c]/30 hover:bg-[#d6b85c]/5'
                  }
                `}
              >
                <div className="mb-3 font-mono text-[10px] font-black tracking-widest text-[#b22222] sm:mb-4">
                  {card.tag}
                </div>
                <h3
                  className={`mb-3 text-lg font-bold italic tracking-wide text-white transition-all duration-300 group-hover:text-[#d6b85c] sm:mb-4 sm:text-xl ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
                >
                  {card.title}
                </h3>
                <p className="min-h-[48px] font-mono text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                  {card.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* --- 04. SOLO DEV ARCHITECTURE FLOW --- */}
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
              <h3
                className={`mb-6 text-2xl font-black uppercase italic sm:mb-8 sm:text-3xl md:text-4xl lg:text-5xl ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
              >
                {t('landing.architecture.title')}
              </h3>
              <p className="mb-6 font-mono text-sm leading-relaxed text-slate-400 sm:mb-8">
                {t('landing.architecture.description')}
              </p>
              <div className="mb-6 rounded-sm border border-[#d6b85c]/30 bg-[#d6b85c]/5 p-4 sm:mb-8 sm:p-5">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-[#d6b85c]">
                  Technology / How It Works
                </p>
                <p className="mt-3 font-mono text-xs leading-relaxed text-slate-300">
                  Crypto Survivors runs on a digital-native substrate where the C-SYNC
                  Protocol converts live market movement into deterministic gameplay
                  events, WebSocket infrastructure keeps market state continuous, and
                  the Neural AI Director tunes encounter pressure while preserving 60
                  FPS behavior.
                </p>
              </div>
              <div className="mb-6 grid gap-3 sm:mb-8 sm:grid-cols-3">
                {technologyHighlights.map(highlight => (
                  <div
                    key={highlight.title}
                    className="border border-white/10 bg-black/30 p-3"
                  >
                    <p className="mb-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#b22222]">
                      {highlight.badge}
                    </p>
                    <p className="mb-2 text-sm font-bold text-white">
                      {highlight.title}
                    </p>
                    <p className="font-mono text-[11px] leading-relaxed text-slate-400">
                      {highlight.description}
                    </p>
                  </div>
                ))}
              </div>

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
                    className="border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-tighter text-slate-500 sm:px-3 sm:text-[10px]"
                  >
                    {tag}
                  </span>
                ))}
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
              <div className="absolute right-0 top-0 p-3 font-mono text-[10px] text-[#d6b85c]/50 sm:p-4">
                INTERNAL_PROTOCOL_LOG
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="h-12 w-1 flex-shrink-0 bg-[#b22222]" />
                  <div>
                    <div className="text-xs font-black uppercase italic text-white">
                      {t('landing.architecture.balance_title')}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {t('landing.architecture.balance_desc')}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="h-12 w-1 flex-shrink-0 bg-[#d6b85c]" />
                  <div>
                    <div className="text-xs font-black uppercase italic text-white">
                      {t('landing.architecture.integrity_title')}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {t('landing.architecture.integrity_desc')}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="h-12 w-1 flex-shrink-0 bg-white" />
                  <div>
                    <div className="text-xs font-black uppercase italic text-white">
                      {t('landing.architecture.performance_title')}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {t('landing.architecture.performance_desc')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="clip-path-poly absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center bg-[#d6b85c]/20">
                <Zap className="h-3 w-3 text-[#d6b85c]" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      {/* --- 05. FEATURE COMPARISON --- */}
      <section className="relative z-10 border-t border-[#b22222]/10 px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="mb-12 text-center sm:mb-16"
          >
            <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
              {t('landing.modes.title')}
            </h2>
            <div
              className={`text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
            >
              {t('landing.modes.subtitle')}
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid gap-4 sm:gap-6 md:grid-cols-2"
          >
            {/* Casual Mode */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ scale: 1.02 }}
              className={`border-2 p-6 transition-all duration-300 sm:p-8 ${
                isRetro
                  ? 'border-[#d6b85c]/30 bg-[#d6b85c]/5 shadow-[6px_6px_0px_rgba(214,184,92,0.1)]'
                  : 'border-[#d6b85c]/20 bg-gradient-to-br from-[#d6b85c]/10 to-transparent'
              }`}
            >
              <div className="mb-6 flex items-center gap-3">
                <Gamepad2 className="h-8 w-8 text-[#d6b85c]" />
                <h3
                  className={`text-xl font-black uppercase italic text-[#d6b85c] sm:text-2xl ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
                >
                  {t('landing.modes.casual_title')}
                </h3>
              </div>
              <p className="mb-6 font-mono text-sm text-slate-400">
                {t('landing.modes.casual_desc')}
              </p>
              <ul className="space-y-3">
                {casualModeItems.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm text-slate-300"
                  >
                    <Check className="h-4 w-4 flex-shrink-0 text-[#d6b85c]" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Competitive Mode */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ scale: 1.02 }}
              className={`relative overflow-hidden border-2 p-6 transition-all duration-300 sm:p-8 ${
                isRetro
                  ? 'border-[#b22222]/30 bg-[#b22222]/5 shadow-[6px_6px_0px_rgba(178,34,34,0.1)]'
                  : 'border-[#b22222]/20 bg-gradient-to-br from-[#b22222]/10 to-transparent'
              }`}
            >
              <div className="absolute right-4 top-4 bg-[#b22222] px-2 py-1 text-[8px] font-black uppercase tracking-wider sm:text-[9px]">
                {t('landing.modes.comp_pro_tag')}
              </div>
              <div className="mb-6 flex items-center gap-3">
                <Trophy className="h-8 w-8 text-[#b22222]" />
                <h3
                  className={`text-xl font-black uppercase italic text-[#b22222] sm:text-2xl ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
                >
                  {t('landing.modes.comp_title')}
                </h3>
              </div>
              <p className="mb-6 font-mono text-sm text-slate-400">
                {t('landing.modes.comp_desc')}
              </p>
              <ul className="space-y-3">
                {competitiveModeItems.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm text-slate-300"
                  >
                    <Check className="h-4 w-4 flex-shrink-0 text-[#b22222]" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* --- 06. ROADMAP --- */}
      <section className="relative z-10 border-t border-[#b22222]/10 bg-[#b22222]/[0.02] px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="mb-12 text-center sm:mb-16"
          >
            <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
              {t('landing.roadmap.title')}
            </h2>
            <div
              className={`text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
            >
              {t('landing.roadmap.subtitle')}
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {roadmapItems.map((phase, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -5 }}
                className={`relative border p-5 transition-all duration-300 sm:p-6 ${
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
                  <div className="absolute -right-2 -top-2 bg-[#d6b85c] px-2 py-0.5 text-[8px] font-black uppercase text-black">
                    {t('landing.roadmap.active_tag')}
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
                  } ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
                >
                  {phase.title}
                </h3>
                <ul className="space-y-2">
                  {phase.items.map((item: string, j: number) => (
                    <li
                      key={j}
                      className={`flex items-start gap-2 font-mono text-[11px] ${
                        phase.status === 'completed'
                          ? 'text-slate-500 line-through'
                          : 'text-slate-400'
                      }`}
                    >
                      {phase.status === 'completed' ? (
                        <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                      ) : phase.status === 'current' ? (
                        <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0 text-[#d6b85c]" />
                      ) : (
                        <Rocket className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-600" />
                      )}
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* --- 07. TEAM / ABOUT --- */}
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
              TEAM / ABOUT
            </h2>
            <div
              className={`text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
            >
              PEOPLE BEHIND THE ENGINE
            </div>
            <p className="mx-auto mt-6 max-w-3xl font-mono text-sm leading-relaxed text-slate-400 sm:text-base">
              Crypto Survivors is built as a public, digital-native software company.
              This section documents who is responsible for product, infrastructure, and
              runtime reliability.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid gap-6 md:grid-cols-3"
          >
            {teamMembers.map(member => (
              <motion.div
                key={member.name}
                variants={fadeInUp}
                whileHover={{ y: -4 }}
                className={`group relative border p-6 transition-all duration-300 sm:p-8
                  ${
                    isRetro
                      ? 'border-white/10 bg-white/5 shadow-[4px_4px_0px_rgba(255,255,255,0.05)] hover:shadow-[6px_6px_0px_rgba(214,184,92,0.15)]'
                      : 'border-white/10 bg-white/5 hover:border-[#d6b85c]/30'
                  }`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#d6b85c] to-[#b22222]">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-wider text-[#d6b85c]">
                      {member.role}
                    </p>
                    <p className="text-lg font-bold text-white">{member.name}</p>
                  </div>
                </div>
                <p className="mb-4 font-mono text-sm leading-relaxed text-slate-300">
                  {member.summary}
                </p>
                <div className="border-l-2 border-[#b22222] pl-3 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  {member.proof}
                </div>
              </motion.div>
            ))}
          </motion.div>
          <div className="mt-8 rounded-sm border border-[#d6b85c]/20 bg-[#d6b85c]/5 p-4 font-mono text-xs leading-relaxed text-slate-300 sm:p-5">
            Audit note: founder and key team members maintain Crypto Survivors in their
            LinkedIn Experience records with role and timeline details.
          </div>
        </div>
      </section>

      {/* --- 07. FAQ ACCORDION --- */}
      <section className="relative z-10 border-t border-[#b22222]/10 px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="mb-12 text-center sm:mb-16"
          >
            <h2 className="mb-4 text-xs font-black uppercase tracking-[0.4em] text-[#d6b85c]">
              {t('landing.faq.title')}
            </h2>
            <div
              className={`text-2xl font-black uppercase italic text-white sm:text-4xl md:text-5xl ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
            >
              {t('landing.faq.subtitle')}
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="space-y-3"
          >
            {faqItems.map((faq, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
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
                  className="flex w-full items-center justify-between gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c] sm:p-5"
                >
                  <span
                    className={`text-sm font-bold sm:text-base ${openFaqIndex === i ? 'text-[#d6b85c]' : 'text-white'}`}
                  >
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${
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
                      <p className="px-4 pb-4 font-mono text-sm leading-relaxed text-slate-400 sm:px-5 sm:pb-5">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* --- 08. FOOTER & LEGAL --- */}
      <footer className="relative z-10 border-t border-[#b22222]/20 bg-black px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 sm:gap-12 md:flex-row md:items-center">
          {/* Logo & Trademark */}
          <div>
            <div className="mb-4 flex flex-col sm:mb-6">
              <span
                className={`text-lg font-black uppercase italic leading-tight tracking-tight text-[#d6b85c] sm:text-xl ${isRetro ? 'font-retro-pixel' : 'cyber-sway-text font-cyber'}`}
              >
                CRYPTO
              </span>
              <span
                className={`-mt-1 text-lg font-black uppercase italic leading-tight tracking-tight text-white sm:text-xl ${isRetro ? 'font-retro-pixel' : 'cyber-sway-text font-cyber'}`}
              >
                SURVIVORS
              </span>
            </div>
            <p className="mb-4 max-w-xs font-mono text-[10px] uppercase tracking-widest text-slate-600">
              {t('landing.footer.trademark')}
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
                className={`border p-2 transition-all duration-300 hover:scale-110 ${
                  isRetro
                    ? 'border-[#5865F2]/30 hover:border-[#5865F2] hover:bg-[#5865F2]/10'
                    : 'border-white/10 hover:border-[#5865F2] hover:bg-[#5865F2]/10'
                }`}
                aria-label={t('landing.footer.discord_soon')}
              >
                <svg
                  className="h-4 w-4 text-[#5865F2]"
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
                className={`border p-2 transition-all duration-300 hover:scale-110 ${
                  isRetro
                    ? 'border-white/30 hover:border-white hover:bg-white/10'
                    : 'border-white/10 hover:border-white hover:bg-white/10'
                }`}
                aria-label={t('landing.footer.twitter_soon')}
              >
                <svg
                  className="h-4 w-4 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Regulatory Navigation */}
          <div className="flex flex-wrap gap-2 font-mono text-xs font-semibold uppercase tracking-widest">
            <button
              onClick={onLaunch}
              className="flex h-10 items-center justify-center border border-white/10 bg-white/5 px-5 text-slate-400 transition-all duration-300 hover:border-[#d6b85c]/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c] active:scale-95"
            >
              {t('landing.footer.access')}
            </button>
            <button
              onClick={onViewPrivacy}
              className="flex h-10 items-center justify-center border border-white/10 bg-white/5 px-5 text-slate-400 transition-all duration-300 hover:border-[#d6b85c]/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c] active:scale-95"
            >
              {t('landing.footer.privacy')}
            </button>
            <button
              onClick={onViewTerms}
              className="flex h-10 items-center justify-center border border-white/10 bg-white/5 px-5 text-slate-400 transition-all duration-300 hover:border-[#d6b85c]/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c] active:scale-95"
            >
              {t('landing.footer.terms')}
            </button>
            <a
              href="mailto:info@crypto-survivors.com"
              className="flex h-10 items-center justify-center border border-white/10 bg-white/5 px-5 text-slate-400 transition-all duration-300 hover:border-[#d6b85c]/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c] active:scale-95"
            >
              {t('landing.footer.contact')}
            </a>
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
        className="fixed z-[60] flex h-10 touch-manipulation items-center gap-2 border border-white/10 bg-white/5 px-4 font-mono text-xs font-semibold uppercase tracking-widest text-slate-400 backdrop-blur-sm transition-all duration-300 hover:border-[#d6b85c]/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c] active:scale-95"
        title={t('landing.footer.back_to_top')}
        style={{
          bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          right: '1rem',
        }}
      >
        ↑ YUKARI
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
