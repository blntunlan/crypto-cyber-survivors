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
      <div className="landing-depth-field absolute inset-0 bg-[radial-gradient(95%_72%_at_18%_26%,rgba(214,184,92,0.12),transparent_52%),radial-gradient(85%_70%_at_88%_74%,rgba(178,34,34,0.24),transparent_58%),linear-gradient(125deg,rgba(2,6,23,0.98)_0%,rgba(7,11,20,0.94)_48%,rgba(19,7,13,0.94)_100%)]" />
      <div className="landing-red-radial absolute -bottom-[18%] -right-[18%] h-[76%] w-[78%] bg-[radial-gradient(ellipse_at_center,rgba(178,34,34,0.32)_0%,rgba(178,34,34,0.18)_34%,rgba(178,34,34,0.06)_58%,transparent_76%)]" />
      <div
        className="landing-candle-ribbon absolute right-0 top-0 hidden h-full w-[46vw] opacity-55 mix-blend-screen md:block"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent 0 22px, rgba(214,184,92,0.16) 22px 24px, transparent 24px 46px, rgba(178,34,34,0.16) 46px 49px, transparent 49px 72px)',
          maskImage:
            'linear-gradient(90deg, transparent 0%, black 35%, black 82%, transparent 100%)',
        }}
      />

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

      <div
        className="absolute inset-0 hidden md:block"
        style={{
          backgroundImage:
            'repeating-linear-gradient(120deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 14px)',
          opacity: 0.12,
        }}
      />

      <div className="landing-market-rift absolute inset-y-0 right-[6%] hidden w-[36vw] -skew-x-12 bg-[linear-gradient(90deg,transparent_0%,rgba(214,184,92,0.07)_34%,rgba(178,34,34,0.14)_52%,transparent_82%)] opacity-70 mix-blend-screen md:block" />

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
