export const PANEL_VARIANTS = {
  modern: 'cyber-glass rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]',
  retro: 'bg-zinc-900 border-2 border-zinc-700 rounded-none shadow-[4px_4px_0px_rgba(0,0,0,0.5)]',
};

export const BUTTON_VARIANTS = {
  primary: {
    modern:
      'rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:shadow-cyan-500/25 text-white shadow-lg',
    retro:
      'rounded-none border-2 border-white bg-blue-600 hover:bg-blue-500 active:translate-y-1 active:shadow-none text-white shadow-[4px_4px_0px_rgba(0,0,0,1)]',
  },
  secondary: {
    modern: 'rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700 text-slate-200',
    retro:
      'rounded-none border-2 border-zinc-500 bg-zinc-800 hover:bg-zinc-700 active:translate-y-1 active:shadow-none text-zinc-300 shadow-[4px_4px_0px_rgba(0,0,0,1)]',
  },
  danger: {
    modern: 'rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-red-500/20',
    retro:
      'rounded-none border-2 border-red-900 bg-red-700 hover:bg-red-600 active:translate-y-1 active:shadow-none text-white shadow-[4px_4px_0px_rgba(0,0,0,1)]',
  },
  ghost: {
    modern: 'rounded-lg hover:bg-white/5 text-slate-400 hover:text-white',
    retro: 'rounded-none hover:bg-white/10 text-zinc-400 hover:text-white border-none shadow-none',
  },
};

export const INPUT_VARIANTS = {
  modern:
    'bg-slate-800/50 border border-white/10 rounded-lg focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 placeholder:text-slate-600',
  retro:
    'bg-black border-2 border-white rounded-none focus:border-yellow-400 placeholder:text-zinc-600 font-mono',
};

export const TEXT_VARIANTS = {
  h1: {
    modern: 'font-cyber font-bold tracking-tighter uppercase cyber-glitch-text',
    retro: 'font-retro-pixel font-bold tracking-normal uppercase',
  },
  h2: {
    modern: 'font-cyber font-semibold tracking-tight',
    retro: 'font-retro-pixel font-bold tracking-normal',
  },
  body: {
    modern: 'font-feed',
    retro: 'font-retro-text',
  },
  mono: {
    modern: 'font-mono',
    retro: 'font-mono text-shadow-none',
  },
};
