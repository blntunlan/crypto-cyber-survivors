import React from 'react';
import { motion } from 'framer-motion';
import { Play, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

interface LandingHeroProps {
  onLaunch: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onLaunch }) => {
  const { t } = useLanguage();

  return (
    <header className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pb-32 sm:pt-24">
      <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
        {/* Main Messaging Sub-module */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-20 flex-1"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded border-l-4 border-[#b22222] bg-[#b22222]/10 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-[#b22222] sm:mb-8 sm:text-xs">
            {t('landing.hero.status')}
          </div>

          <h1 className="mb-6 font-cyber text-3xl font-black italic leading-[0.95] tracking-tighter sm:mb-8 sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl 2xl:text-8xl">
            <span className="mb-4 block font-mono text-xs not-italic tracking-[0.5em] text-[#d6b85c] sm:text-sm">
              CRYPTO SURVIVORS
            </span>
            {t('landing.hero.title_top')} <br />
            <span className="bg-gradient-to-r from-[#d6b85c] via-[#ffd600] to-white bg-clip-text pr-[0.15em] text-transparent">
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
              className="flex min-h-[48px] w-full items-center justify-center gap-3 border border-[#b22222]/30 px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-300 transition-all duration-300 hover:bg-[#b22222]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c] sm:w-auto sm:px-8 sm:py-5"
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
  );
};
