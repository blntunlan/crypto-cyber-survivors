import React from 'react';
import { useReducedMotion } from 'framer-motion';

export const LandingBackground: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[#020617]" />
      <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_50%_0%,rgba(214,184,92,0.12),transparent_55%),radial-gradient(110%_90%_at_95%_90%,rgba(178,34,34,0.15),transparent_60%),radial-gradient(90%_80%_at_10%_80%,rgba(15,23,42,0.8),transparent_65%)]" />

      {/* Gold blob - CSS animation instead of framer-motion */}
      <div
        className={`absolute -left-[18%] top-[-12%] h-[56%] w-[56%] rounded-full bg-[#d6b85c]/[0.12] blur-[120px] md:blur-[150px] ${prefersReducedMotion ? 'opacity-[0.28]' : 'landing-blob-gold'}`}
      />
      {/* Red blob - CSS animation */}
      <div
        className={`absolute -bottom-[24%] -right-[16%] h-[62%] w-[62%] rounded-full bg-[#b22222]/[0.14] blur-[130px] md:blur-[170px] ${prefersReducedMotion ? 'opacity-[0.26]' : 'landing-blob-red'}`}
      />

      {/* Grid pattern - static with subtle opacity pulse via CSS */}
      <div
        className={`absolute inset-0 ${prefersReducedMotion ? 'opacity-[0.18]' : 'landing-grid-pulse'}`}
        style={{
          backgroundImage:
            'linear-gradient(rgba(214,184,92,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(214,184,92,0.08) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
          maskImage: 'radial-gradient(ellipse at center, black 42%, transparent 85%)',
          opacity: prefersReducedMotion ? 0.18 : undefined,
        }}
      />

      {/* Striped pattern - static, no animation needed for subtle effect */}
      <div
        className="absolute inset-0 hidden md:block"
        style={{
          backgroundImage:
            'repeating-linear-gradient(120deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 14px)',
          opacity: 0.12,
        }}
      />

      {/* Gold gradient sweep - CSS animation */}
      <div
        className={`absolute -left-[35%] top-[-28%] h-[95%] w-[95%] rotate-[-20deg] bg-[linear-gradient(90deg,transparent_0%,rgba(214,184,92,0.34)_45%,transparent_100%)] blur-[68px] ${prefersReducedMotion ? 'opacity-[0.2]' : 'landing-sweep-gold'}`}
      />
      {/* Red gradient sweep - CSS animation */}
      <div
        className={`absolute -right-[38%] bottom-[-35%] h-[110%] w-[90%] rotate-[18deg] bg-[linear-gradient(90deg,transparent_0%,rgba(178,34,34,0.30)_45%,transparent_100%)] blur-[72px] ${prefersReducedMotion ? 'opacity-[0.18]' : 'landing-sweep-red'}`}
      />

      {/* Rotating circle - CSS animation */}
      <div
        className={`absolute left-1/2 top-1/2 hidden h-[66vmax] w-[66vmax] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d6b85c]/15 md:block ${prefersReducedMotion ? '' : 'landing-rotate-circle'}`}
      />

      <div
        className="absolute inset-0 opacity-[0.15] md:opacity-[0.2]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.18) 0.8px, transparent 0.8px)',
          backgroundSize: '3px 3px',
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08)_0%,rgba(2,6,23,0.22)_45%,rgba(2,6,23,0.58)_100%)]" />
      <div className="animate-scanline absolute inset-0 h-[2px] w-full bg-gradient-to-b from-transparent via-[#d6b85c]/10 to-transparent" />
    </div>
  );
};
