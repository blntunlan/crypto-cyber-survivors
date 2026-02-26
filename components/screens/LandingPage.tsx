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
import { m, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { type Language } from '../../contexts/LanguageConstants';
import { LandingHero } from './landing/LandingHero';
import { LandingStats } from './landing/LandingStats';
import { LandingFeatures } from './landing/LandingFeatures';
import { LandingArchitecture } from './landing/LandingArchitecture';
import { LandingModes } from './landing/LandingModes';
import { LandingTestimonials } from './landing/LandingTestimonials';
import { LandingRoadmap } from './landing/LandingRoadmap';
import { LandingTeam } from './landing/LandingTeam';
import { LandingFaq } from './landing/LandingFaq';
import { LandingFooter } from './landing/LandingFooter';
import { LandingBackground } from './landing/LandingBackground';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const originalLanguageRef = useRef<Language>(language);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-landing-active', 'true');
    return () => {
      root.removeAttribute('data-landing-active');
    };
  }, []);

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

  const navLabel = (key: string): string =>
    t(key)
      .replace(/^\s*\d+\.\s*/, '')
      .trim();
  const framedNavButtonClass =
    'group relative flex h-12 items-center justify-center overflow-hidden whitespace-nowrap px-3 xl:px-4 text-slate-300 transition-all duration-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c]';
  const navAccentLineClass =
    'pointer-events-none absolute bottom-[7px] left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#d6b85c]/55 to-transparent opacity-80 transition-all duration-300 group-hover:via-[#ffd86a] group-hover:opacity-100';
  const desktopNavLabelClass = 'font-cyber text-[13px] tracking-[0.09em]';
  const desktopCtaClass = 'font-cyber text-[13px] tracking-[0.11em]';

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="allow-scroll min-h-screen overflow-x-hidden bg-[#020617] font-sans text-white selection:bg-[#d6b85c]/30"
    >
      {/* --- 00. BACKGROUND ARCHITECTURE --- */}
      <LandingBackground />
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
          <span className="cyber-sway-text font-cyber text-xl font-black uppercase italic leading-tight tracking-tight text-[#d6b85c] sm:text-2xl">
            CRYPTO
          </span>
          <span className="cyber-sway-text -mt-1 font-cyber text-xl font-black uppercase italic leading-tight tracking-tight text-white sm:text-2xl">
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
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <m.nav
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
                className="mt-auto min-h-[48px] w-full border border-[#d6b85c] bg-[#d6b85c] p-4 text-center font-black text-black shadow-[0_0_20px_rgba(214,184,92,0.3)] transition-all duration-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95"
              >
                {t('landing.nav.execute')}
              </button>
            </m.nav>
          </m.div>
        )}
      </AnimatePresence>
      {/* --- 02. HERO & CTA STACK --- */}
      <LandingHero onLaunch={onLaunch} />

      {/* --- STATS COUNTER SECTION --- */}
      <LandingStats />

      {/* --- 03. ENGINEERING EXCELLENCE SHOWCASE --- */}
      <LandingFeatures />

      {/* --- 04. SOLO DEV ARCHITECTURE FLOW --- */}
      <LandingArchitecture />
      {/* --- 05. FEATURE COMPARISON --- */}
      <LandingModes />

      {/* --- 06. SOCIAL PROOF / TESTIMONIALS --- */}
      <LandingTestimonials />

      {/* --- 07. ROADMAP --- */}
      <LandingRoadmap />

      {/* --- 08. TEAM / ABOUT --- */}
      <LandingTeam />

      {/* --- 09. FAQ ACCORDION --- */}
      <LandingFaq />

      <LandingFooter
        onLaunch={onLaunch}
        onViewPrivacy={onViewPrivacy}
        onViewTerms={onViewTerms}
      />
      {/* --- 06. GLOBAL STYLE INJECTIONS --- */}
      <style>{`
        @keyframes scanline { 0% { top: -10%; } 100% { top: 110%; } }
        .animate-scanline { animation: scanline 9s linear infinite; opacity: 0.6; }
        @media (max-width: 640px) {
          .animate-scanline { animation-duration: 12s; opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-scanline { animation: none; opacity: 0; }
        }
        .clip-path-poly { clip-path: polygon(100% 0, 100% 100%, 0 100%); }
        .font-display { font-family: 'Orbitron', sans-serif; }
      `}</style>
    </m.div>
  );
};
