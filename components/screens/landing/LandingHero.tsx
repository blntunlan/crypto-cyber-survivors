import React from 'react';
import { trackRender } from '../../../utils/trackRender';
import { Play, ArrowRight } from 'lucide-react';
import { LandingPriceFeed } from './LandingPriceFeed';

interface LandingHeroProps {
  onLaunch: () => void;
}

const ARENA_RULES = [
  { label: 'VOL', value: 'SWARM RATE', tone: 'border-[#b22222]/45 text-[#ff5f5f]' },
  { label: 'PUMP', value: 'LOOT WINDOW', tone: 'border-[#22c55e]/45 text-[#6ee7b7]' },
  { label: 'DUMP', value: 'CURSE FIELD', tone: 'border-[#d6b85c]/45 text-[#ffd86a]' },
] as const;

export const LandingHero: React.FC<LandingHeroProps> = ({ onLaunch }) => {
  trackRender('LandingHero');

  return (
    <header className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pb-32 sm:pt-20 lg:px-10">
      <div className="flex w-full min-w-0 flex-col items-center gap-12 lg:flex-row lg:gap-14">
        {/* Main Messaging Sub-module */}
        <div className="relative z-20 w-full min-w-0 flex-1 lg:pt-6">
          <div className="mb-6 inline-flex max-w-full flex-wrap items-center gap-2 rounded border border-[#b22222]/30 bg-[#b22222]/10 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-[#ff6b6b] shadow-[inset_3px_0_0_rgba(255,107,107,0.7)] sm:mb-8 sm:text-xs">
            OPEN BETA v1.0 · LIVE BTC/USD FEED
          </div>

          <h1 className="mb-6 max-w-full font-cyber text-3xl font-semibold italic leading-[0.95] tracking-tighter sm:mb-8 sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl 2xl:text-8xl">
            {/* Kept in the h1 for the page name, hidden visually because the
                wordmark already sits directly above it in the nav. */}
            <span className="sr-only">Crypto Survivors — </span>
            EVERY CANDLE <br />
            <span className="pr-[0.15em] text-[#ffd600]">WANTS YOU DEAD</span>
          </h1>

          <p className="mb-8 max-w-xl break-words font-mono text-sm leading-relaxed text-slate-300 sm:mb-10 sm:text-base md:text-lg">
            A survivors arena wired to the live BTC/USD feed. Volatility raises spawn
            pressure, pumps drop loot, dumps punish greed — cash out mid-run or ride it
            to liquidation.
          </p>

          <div className="mb-8 grid max-w-xl grid-cols-3 gap-2 font-mono sm:mb-10 sm:gap-3">
            {ARENA_RULES.map(rule => (
              <div
                key={rule.label}
                className={`border bg-black/25 px-3 py-2 ${rule.tone}`}
              >
                <div className="text-[9px] font-black tracking-[0.28em] text-slate-400">
                  {rule.label}
                </div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-wider sm:text-xs">
                  {rule.value}
                </div>
              </div>
            ))}
          </div>

          <div className="flex w-full max-w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onLaunch}
              className="group relative flex min-h-[48px] w-full max-w-full items-center justify-center gap-3 overflow-hidden bg-[#d6b85c] px-4 py-4 text-center text-base font-black text-black transition-all duration-300 hover:bg-[#ffd600] hover:shadow-[0_0_40px_rgba(214,184,92,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95 sm:w-auto sm:px-10 sm:py-5 sm:text-xl md:text-2xl"
            >
              <div className="absolute inset-x-0 -top-full h-[2px] bg-white opacity-20 transition-all duration-700 group-hover:top-full" />
              <Play className="h-5 w-5 flex-shrink-0 fill-current sm:h-6 sm:w-6" />
              START SURVIVAL
              <ArrowRight className="h-4 w-4 flex-shrink-0 transition-transform duration-300 group-hover:translate-x-1 sm:h-5 sm:w-5" />
            </button>
            <a
              href="https://github.com/blntunlan/crypto-cyber-survivors"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[48px] w-full max-w-full items-center justify-center gap-3 border border-[#b22222]/30 px-5 py-4 text-center text-xs font-bold uppercase tracking-widest text-slate-300 transition-all duration-300 hover:bg-[#b22222]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c] sm:w-auto sm:px-8 sm:py-5"
            >
              <svg
                className="size-5 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              READ THE SOURCE
            </a>
          </div>

          {/* Engine Proof Points */}
          <div className="mt-8 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5 border border-white/10 bg-white/[0.02] px-2.5 py-1">
              <span className="size-1.5 rounded-full bg-[#22c55e]" />
              60 FPS RAW CANVAS
            </span>
            <span className="flex items-center gap-1.5 border border-white/10 bg-white/[0.02] px-2.5 py-1">
              <span className="size-1.5 rounded-full bg-[#ffd86a]" />
              LIVE SSE INGEST
            </span>
            <span className="flex items-center gap-1.5 border border-white/10 bg-white/[0.02] px-2.5 py-1">
              <span className="size-1.5 rounded-full bg-[#ff7777]" />
              SERVER VERIFIED
            </span>
          </div>
        </div>

        <div className="w-full min-w-0 max-w-xl flex-1 lg:max-w-none">
          <LandingPriceFeed />
        </div>
      </div>
    </header>
  );
};
