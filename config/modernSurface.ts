/**
 * Shared modern (cyberpunk) surface styles.
 * Keeps overlay/panel rhythm consistent across hub, menus, settings and modal screens.
 * Matches MainMenu's solid panel aesthetic for visual continuity between menu and in-game screens.
 */
export const MODERN_SCREEN_OVERLAY = 'bg-slate-950/92';

export const MODERN_PANEL_FRAME =
  'relative overflow-hidden rounded-[1.5rem] border border-white/20 bg-slate-900/92 shadow-[0_20px_80px_rgba(2,6,23,0.8),0_0_0_1px_rgba(148,163,184,0.22)]';

export const MODERN_PANEL_OUTER_BORDER =
  'pointer-events-none absolute inset-0 rounded-[1.5rem] border border-white/25';

export const MODERN_PANEL_INNER_BORDER =
  'pointer-events-none absolute inset-2 rounded-[1.1rem] border border-cyan-200/10';

export const MODERN_PANEL_TOP_ACCENT =
  'pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent';
