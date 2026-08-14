/**
 * LandingPage.tsx - Public game landing and app entry surface.
 */

import React, { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { trackRender } from '../../utils/trackRender';
import { Menu, X } from 'lucide-react';
import { LandingHero } from './landing/LandingHero';
import { LandingFeatures } from './landing/LandingFeatures';
import { LandingArchitecture } from './landing/LandingArchitecture';
import { LandingModes } from './landing/LandingModes';
import { LandingRoadmap } from './landing/LandingRoadmap';
import { LandingTeam } from './landing/LandingTeam';
import { LandingFaq } from './landing/LandingFaq';
import { LandingFooter } from './landing/LandingFooter';
import { LandingBackground } from './landing/LandingBackground';
import { ThemedButton } from '../themed/ThemedButton';
import { ThemedIconButton } from '../themed/ThemedIconButton';
interface LandingPageProps {
  onLaunch: () => void;
  onViewPrivacy: () => void;
  onViewTerms: () => void;
  onViewDocs: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunch,
  onViewPrivacy,
  onViewTerms,
  onViewDocs,
}) => {
  trackRender('LandingPage');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-landing-active', 'true');
    return () => {
      root.removeAttribute('data-landing-active');
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const root = rootRef.current;
    const backgroundSiblings = root
      ? Array.from(root.children).filter(
          child => !(child instanceof HTMLElement && child.dataset.mobileMenuOverlay)
        )
      : [];
    backgroundSiblings.forEach(child => {
      if (child instanceof HTMLElement) child.inert = true;
    });

    const menu = mobileMenuRef.current;
    const focusable = menu?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMobileMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      backgroundSiblings.forEach(child => {
        if (child instanceof HTMLElement) child.inert = false;
      });
      document.getElementById('landing-mobile-menu-trigger')?.focus();
    };
  }, [isMobileMenuOpen]);

  const framedNavButtonClass =
    'group relative flex h-12 items-center justify-center overflow-hidden whitespace-nowrap px-3 text-[color:var(--ui-text-secondary)] transition-all duration-300 hover:text-[color:var(--ui-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-focus-ring)] xl:px-4';
  const navAccentLineClass =
    'pointer-events-none absolute bottom-[7px] left-4 right-4 h-px bg-amber-500 opacity-80 transition-all duration-300 group-hover:opacity-100 group-hover:shadow-[0_0_8px_rgba(245,158,11,0.6)]';
  const desktopNavLabelClass = 'font-cyber text-[13px] tracking-[0.09em]';

  return (
    <m.div
      ref={rootRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="allow-scroll min-h-screen overflow-x-hidden bg-[color:var(--ui-surface-canvas)] font-sans text-[color:var(--ui-text-primary)]"
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
          className="flex flex-col pr-4 transition-all duration-300 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-focus-ring)] lg:pr-0"
        >
          <span className="cyber-sway-text font-cyber text-xl font-black uppercase italic leading-tight tracking-tight text-white sm:text-2xl">
            CRYPTO
          </span>
          <span className="cyber-sway-text -mt-1 font-cyber text-xl font-black uppercase italic leading-tight tracking-tight text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)] sm:text-2xl">
            SURVIVORS
          </span>
        </a>

        {/* Mobile Menu Button */}
        <ThemedIconButton
          id="landing-mobile-menu-trigger"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="landing-mobile-menu"
          className="xl:hidden"
        >
          <Menu className="h-6 w-6" />
        </ThemedIconButton>

        {/* Desktop Nav Menu */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-3 xl:flex">
          {/* Navigation Links */}
          <a href="#engine" className={`${framedNavButtonClass} w-[108px]`}>
            <span className={desktopNavLabelClass}>Engine</span>
            <span className={navAccentLineClass} />
          </a>
          <a href="#pipeline" className={`${framedNavButtonClass} w-[118px]`}>
            <span className={desktopNavLabelClass}>Pipeline</span>
            <span className={navAccentLineClass} />
          </a>
          <a href="#dev" className={`${framedNavButtonClass} w-[120px]`}>
            <span className={desktopNavLabelClass}>Solo Dev</span>
            <span className={navAccentLineClass} />
          </a>
          <a href="#team" className={`${framedNavButtonClass} w-[96px]`}>
            <span className={desktopNavLabelClass}>TEAM</span>
            <span className={navAccentLineClass} />
          </a>
          <ThemedButton
            id="docs-nav-link"
            onClick={onViewDocs}
            intent="ghost"
            size="sm"
            className="hidden w-[146px] xl:inline-flex"
          >
            <span className={desktopNavLabelClass}>Documentation</span>
          </ThemedButton>
        </div>
        {/* Desktop CTA */}
        <ThemedButton
          onClick={onLaunch}
          intent="primary"
          size="lg"
          className="hidden min-w-[182px] xl:inline-flex"
        >
          PLAY THE BETA
        </ThemedButton>
      </nav>

      {/* --- MOBILE MENU DRAWER --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <m.div
            data-mobile-menu-overlay="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-[color:var(--ui-surface-canvas)]/90 fixed inset-0 z-[100] backdrop-blur-sm xl:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <m.nav
              ref={mobileMenuRef}
              id="landing-mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
              className="absolute right-0 top-0 flex h-full w-[280px] flex-col border-l border-[color:var(--ui-action-primary-border)] bg-[color:var(--ui-surface-canvas)] p-6"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <ThemedIconButton
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
                className="absolute right-4 top-4"
              >
                <X className="h-6 w-6" />
              </ThemedIconButton>

              {/* Mobile Menu Items */}
              <div className="mt-16 flex flex-col gap-2 font-mono text-sm font-black uppercase tracking-widest">
                <a
                  href="#engine"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="group relative min-h-[48px] w-full overflow-hidden border border-white/10 bg-[color:var(--ui-surface-inset)] p-4 text-left text-[color:var(--ui-text-secondary)] transition-all duration-300 hover:border-amber-500/40 hover:text-[color:var(--ui-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-focus-ring)]"
                >
                  <span>Engine</span>
                  <span className="pointer-events-none absolute bottom-[8px] left-4 right-4 h-px bg-amber-500 opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                </a>

                <a
                  href="#pipeline"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="group relative min-h-[48px] w-full overflow-hidden border border-white/10 bg-[color:var(--ui-surface-inset)] p-4 text-left text-[color:var(--ui-text-secondary)] transition-all duration-300 hover:border-amber-500/40 hover:text-[color:var(--ui-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-focus-ring)]"
                >
                  <span>Pipeline</span>
                  <span className="pointer-events-none absolute bottom-[8px] left-4 right-4 h-px bg-amber-500 opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                </a>

                <a
                  href="#dev"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="group relative min-h-[48px] w-full overflow-hidden border border-white/10 bg-[color:var(--ui-surface-inset)] p-4 text-left text-[color:var(--ui-text-secondary)] transition-all duration-300 hover:border-amber-500/40 hover:text-[color:var(--ui-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-focus-ring)]"
                >
                  <span>Solo Dev</span>
                  <span className="pointer-events-none absolute bottom-[8px] left-4 right-4 h-px bg-amber-500 opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                </a>
                <a
                  href="#team"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="group relative min-h-[48px] w-full overflow-hidden border border-white/10 bg-[color:var(--ui-surface-inset)] p-4 text-left text-[color:var(--ui-text-secondary)] transition-all duration-300 hover:border-amber-500/40 hover:text-[color:var(--ui-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-focus-ring)]"
                >
                  <span>TEAM</span>
                  <span className="pointer-events-none absolute bottom-[8px] left-4 right-4 h-px bg-amber-500 opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                </a>

                <ThemedButton
                  onClick={() => {
                    onViewDocs();
                    setIsMobileMenuOpen(false);
                  }}
                  intent="secondary"
                  className="w-full justify-start"
                >
                  <span>Documentation</span>
                </ThemedButton>
              </div>

              {/* Mobile CTA */}
              <div className="mt-auto">
                <ThemedButton
                  onClick={() => {
                    onLaunch();
                    setIsMobileMenuOpen(false);
                  }}
                  intent="primary"
                  size="lg"
                  className="w-full"
                >
                  PLAY THE BETA
                </ThemedButton>
              </div>
            </m.nav>
          </m.div>
        )}
      </AnimatePresence>
      {/* --- 02. HERO & CTA STACK --- */}
      <LandingHero onLaunch={onLaunch} />

      {/* --- 03. ENGINEERING EXCELLENCE SHOWCASE --- */}
      <LandingFeatures />

      {/* --- 04. SOLO DEV ARCHITECTURE FLOW --- */}
      <LandingArchitecture />
      {/* --- 05. FEATURE COMPARISON --- */}
      <LandingModes />

      {/* --- 06. ROADMAP --- */}
      <LandingRoadmap />

      {/* --- 07. TEAM / ABOUT --- */}
      <LandingTeam />

      {/* --- 08. FAQ ACCORDION --- */}
      <LandingFaq />

      <LandingFooter
        onLaunch={onLaunch}
        onViewPrivacy={onViewPrivacy}
        onViewTerms={onViewTerms}
      />
      {/* --- 06. GLOBAL STYLE INJECTIONS --- */}
      <style>{`
        @keyframes scanline { 0% { transform: translateY(-10vh); } 100% { transform: translateY(110vh); } }
        .animate-scanline { animation: scanline 9s linear infinite; opacity: 0.6; will-change: transform; }
        @media (max-width: 640px) {
          .animate-scanline { animation-duration: 12s; opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-scanline { animation: none; opacity: 0; }
        }
        .font-display { font-family: 'Orbitron', sans-serif; }
      `}</style>
    </m.div>
  );
};
