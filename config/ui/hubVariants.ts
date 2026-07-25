import { type ThemeName } from '../../types/theme';

type HubSkin = {
  accessLabel: string;
  accessRailEnd: string;
  accessRailStart: string;
  backdrop: string;
  headerAccent: string;
  headerAccentEffect: string;
  header: string;
  isRetroIconStyle: boolean;
  panelDecoration: string;
  panelInnerDecoration: string;
  panelTopDecoration: string;
  subtitle: string;
  metric: string;
  metricLabel: string;
  metricValue: string;
  navigationHelp: string;
  navigationHelpKey: 'hub.nav_help_modern' | 'hub.nav_help_retro';
  resolveAccentColor: (pairColor: string) => string;
};

export const HUB_SKINS: Record<ThemeName, HubSkin> = {
  cyberpunk: {
    accessLabel:
      'font-cyber text-[9px] uppercase font-bold tracking-[0.15em] sm:text-[10px] sm:tracking-[0.2em]',
    accessRailEnd: 'bg-gradient-to-l from-transparent to-white/10',
    accessRailStart: 'bg-gradient-to-r from-transparent to-white/10',
    backdrop: 'bg-[color:var(--ui-surface-canvas)]',
    headerAccent: 'text-pump-green',
    header: 'cyber-sway-text font-cyber text-[color:var(--ui-text-primary)]',
    headerAccentEffect: 'sm:drop-shadow-[0_0_20px_var(--tw-shadow-color)]',
    isRetroIconStyle: false,
    panelDecoration:
      'pointer-events-none absolute inset-0 rounded-lg border border-white/25 opacity-100',
    panelInnerDecoration:
      'pointer-events-none absolute inset-2 rounded-lg border border-cyan-200/10 opacity-100',
    panelTopDecoration:
      'pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-100',
    subtitle: 'font-cyber text-slate-500',
    metric:
      'rounded-lg border border-white/5 bg-white/5 transition-shadow duration-[var(--ui-motion-duration-fast)] hover:shadow-[0_0_25px_rgba(148,163,184,0.25)]',
    metricLabel: 'font-cyber text-xs uppercase tracking-[0.25em] text-slate-400',
    metricValue: 'font-numbers text-2xl font-black',
    navigationHelp: 'font-display text-[9px] sm:text-[10px]',
    navigationHelpKey: 'hub.nav_help_modern',
    resolveAccentColor: pairColor => pairColor,
  },
  'retro-16bit': {
    accessLabel:
      'font-retro-pixel text-[9px] uppercase font-bold tracking-[0.15em] sm:text-[10px] sm:tracking-[0.2em]',
    accessRailEnd: 'bg-[#39FF14]/30',
    accessRailStart: 'bg-[#39FF14]/30',
    backdrop: 'bg-[color:var(--ui-surface-canvas)]',
    headerAccent: 'text-[color:var(--ui-text-primary)]',
    header: 'font-retro-pixel text-[color:var(--ui-action-primary-surface)]',
    headerAccentEffect: 'drop-shadow-[0_0_10px_rgba(0,191,255,0.5)]',
    isRetroIconStyle: true,
    panelDecoration:
      'pointer-events-none absolute inset-0 border-2 border-[#39FF14]/30 opacity-0',
    panelInnerDecoration:
      'pointer-events-none absolute inset-2 border-2 border-[#39FF14]/20 opacity-0',
    panelTopDecoration:
      'pointer-events-none absolute left-0 right-0 top-0 h-1 bg-[#39FF14]/45 opacity-0',
    subtitle: 'font-retro-pixel text-[10px] text-[#39FF14]',
    metric: 'border-2 border-[#39FF14]/30 bg-zinc-900/70 rounded-none',
    metricLabel: 'font-retro-pixel text-[9px] text-slate-400',
    metricValue: 'font-retro-pixel text-xl',
    navigationHelp: 'font-retro-pixel text-[9px]',
    navigationHelpKey: 'hub.nav_help_retro',
    resolveAccentColor: () => '#00BFFF',
  },
};
