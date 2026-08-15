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

      {/* Ambient background depth */}
      <div className="landing-depth-field absolute inset-0 bg-[radial-gradient(95%_72%_at_18%_26%,rgba(214,184,92,0.10),transparent_52%),radial-gradient(75%_60%_at_80%_60%,rgba(178,34,34,0.10),transparent_60%),linear-gradient(125deg,rgba(2,6,23,0.98)_0%,rgba(7,11,20,0.95)_48%,rgba(10,8,18,0.96)_100%)]" />

      {/* Subtle balanced red accent - softly contained, no harsh bottom-right leak */}
      <div className="landing-red-radial absolute -bottom-[10%] right-0 h-[50%] w-[45%] bg-[radial-gradient(ellipse_at_center,rgba(178,34,34,0.12)_0%,rgba(178,34,34,0.05)_40%,transparent_70%)] opacity-60" />

      {/* Candlestick ribbon - softly masked with vertical top/bottom fade */}
      <div
        className="landing-candle-ribbon absolute right-0 top-0 hidden h-full w-[38vw] opacity-20 mix-blend-screen md:block"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent 0 24px, rgba(214,184,92,0.12) 24px 25px, transparent 25px 48px, rgba(178,34,34,0.10) 48px 50px, transparent 50px 72px)',
          maskImage:
            'linear-gradient(180deg, transparent 0%, black 15%, black 75%, transparent 98%), linear-gradient(90deg, transparent 0%, black 40%, black 80%, transparent 100%)',
        }}
      />

      {/* Grid Pulse */}
      <div
        className={`absolute inset-0 ${prefersReducedMotion ? 'opacity-[0.15]' : 'landing-grid-pulse'}`}
        style={{
          backgroundImage:
            'linear-gradient(rgba(214,184,92,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(214,184,92,0.06) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
          opacity: prefersReducedMotion ? 0.15 : undefined,
        }}
      />

      {/* Subtle technical crosshair overlay */}
      <div
        className="absolute inset-0 hidden opacity-15 md:block"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(214,184,92,0.35) 1px, transparent 0)',
          backgroundSize: '52px 52px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
        }}
      />

      {/* Diagonal scan noise */}
      <div
        className="absolute inset-0 hidden md:block"
        style={{
          backgroundImage:
            'repeating-linear-gradient(120deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 16px)',
          opacity: 0.08,
        }}
      />

      {/* Market rift - subdued with smooth fade */}
      <div
        className="landing-market-rift absolute inset-y-0 right-[8%] hidden w-[28vw] -skew-x-12 bg-[linear-gradient(90deg,transparent_0%,rgba(214,184,92,0.05)_34%,rgba(178,34,34,0.08)_52%,transparent_82%)] opacity-40 mix-blend-screen md:block"
        style={{
          maskImage:
            'linear-gradient(180deg, transparent 0%, black 20%, black 70%, transparent 95%)',
        }}
      />

      {/* Star grain */}
      <div
        className="absolute inset-0 opacity-[0.12] md:opacity-[0.16]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.15) 0.8px, transparent 0.8px)',
          backgroundSize: '3px 3px',
        }}
      />

      {/* Vignette with clean dark fade towards bottom */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.05)_0%,rgba(2,6,23,0.3)_60%,rgba(2,6,23,0.92)_100%)]" />
      <div className="animate-scanline absolute inset-0 h-[2px] w-full bg-gradient-to-b from-transparent via-[#d6b85c]/10 to-transparent" />
    </div>
  );
};
