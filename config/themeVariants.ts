export const PANEL_VARIANTS = {
  modern: 'rounded-lg border border-white/10 bg-white/5',
  retro:
    'bg-[#0a0a12]/95 border-2 border-[#39FF14]/60 rounded-none shadow-[4px_4px_0px_rgba(57,255,20,0.3)]',
};

export const BUTTON_VARIANTS = {
  primary: {
    modern:
      'rounded-lg border border-cyan-400/30 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] text-white shadow-lg shadow-cyan-900/20',
    retro:
      'rounded-none border-2 border-[#FFD600] bg-[#00BFFF] hover:bg-[#39FF14] active:translate-y-1 active:shadow-none text-white shadow-[4px_4px_0px_rgba(0,0,0,1)]',
  },
  secondary: {
    modern:
      'rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700 text-slate-200',
    retro:
      'rounded-none border-2 border-[#39FF14]/50 bg-[#0a0a12] hover:bg-[#39FF14]/20 active:translate-y-1 active:shadow-none text-[#39FF14] shadow-[4px_4px_0px_rgba(0,0,0,1)]',
  },
  danger: {
    modern:
      'rounded-lg bg-red-600 shadow-lg shadow-red-900/30 hover:bg-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] text-white',
    retro:
      'rounded-none border-2 border-[#FF3D00] bg-[#B22222] hover:bg-[#FF3D00] active:translate-y-1 active:shadow-none text-white shadow-[4px_4px_0px_rgba(0,0,0,1)]',
  },
  ghost: {
    modern: 'rounded-lg hover:bg-white/5 text-slate-400 hover:text-white',
    retro:
      'rounded-none hover:bg-[#39FF14]/10 text-[#DCDCDC] hover:text-[#39FF14] border-none shadow-none',
  },
};

export const INPUT_VARIANTS = {
  modern:
    'bg-slate-800/50 border border-white/10 rounded-lg focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 placeholder:text-slate-600',
  retro:
    'bg-[#0a0a12] border-2 border-[#39FF14]/50 rounded-none focus:border-[#FFD600] placeholder:text-[#DCDCDC]/50 font-mono',
};

export const TEXT_VARIANTS = {
  h1: {
    modern: 'font-cyber font-bold tracking-tighter uppercase cyber-glitch-text',
    retro: 'font-retro-pixel font-bold tracking-normal uppercase text-[#FFD600]',
  },
  h2: {
    modern: 'font-cyber font-semibold tracking-tight',
    retro: 'font-retro-pixel font-bold tracking-normal text-[#00BFFF]',
  },
  body: {
    modern: 'font-feed',
    retro: 'font-retro-text text-[#DCDCDC]',
  },
  mono: {
    modern: 'font-mono',
    retro: 'font-mono text-shadow-none text-[#39FF14]',
  },
};
