import { type ThemeName } from '../../types/theme';

export const BUTTON_INTENTS = ['primary', 'secondary', 'danger', 'ghost'] as const;
export const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;
export const PANEL_SURFACES = ['default', 'raised', 'inset'] as const;
export const PANEL_PADDINGS = ['none', 'sm', 'md', 'lg'] as const;
export const BADGE_TONES = ['neutral', 'success', 'warning', 'danger'] as const;
export const SELECTION_CARD_SIZES = ['compact', 'default', 'large'] as const;
export const SELECTION_CARD_TONES = ['neutral', 'success', 'danger'] as const;
export const SELECTION_CARD_VARIANTS = [
  'default',
  'asset',
  'leverage',
  'position',
] as const;

export type UiButtonIntent = (typeof BUTTON_INTENTS)[number];
export type UiButtonSize = (typeof BUTTON_SIZES)[number];
export type UiPanelSurface = (typeof PANEL_SURFACES)[number];
export type UiPanelPadding = (typeof PANEL_PADDINGS)[number];
export type UiBadgeTone = (typeof BADGE_TONES)[number];
export type UiSelectionCardSize = (typeof SELECTION_CARD_SIZES)[number];
export type UiSelectionCardTone = (typeof SELECTION_CARD_TONES)[number];
export type UiSelectionCardVariant = (typeof SELECTION_CARD_VARIANTS)[number];
export type UiTextVariant = 'h1' | 'h2' | 'body' | 'mono';

type UiComponentSkin = {
  button: {
    base: string;
    size: Record<UiButtonSize, string>;
    intent: Record<UiButtonIntent, string>;
    selected: string;
  };
  iconButton: {
    base: string;
    intent: Record<UiButtonIntent, string>;
  };
  control: {
    base: string;
    input: string;
    textarea: string;
    select: string;
  };
  panel: {
    base: string;
    padding: Record<UiPanelPadding, string>;
    surface: Record<UiPanelSurface, string>;
  };
  badge: {
    base: string;
    tone: Record<UiBadgeTone, string>;
  };
  selectionCard: {
    base: string;
    disabled: string;
    selected: string;
    selectedVariant: Record<UiSelectionCardVariant, string>;
    size: Record<UiSelectionCardSize, string>;
    tone: Record<UiSelectionCardTone, string>;
    variant: Record<UiSelectionCardVariant, string>;
  };
  divider: string;
  text: Record<UiTextVariant, string>;
  overlay: {
    backdrop: string;
    decoration: string;
    header: string;
    rail: string;
    railLine: string;
    subtitle: string;
    title: string;
    style: string;
  };
};

const SHARED_BUTTON_BASE =
  'inline-flex touch-manipulation items-center justify-center gap-2 border font-cyber font-semibold uppercase transition-colors duration-[var(--ui-motion-duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus-ring)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50';

const SHARED_BUTTON_SIZES: Record<UiButtonSize, string> = {
  sm: 'min-h-[44px] px-3 text-xs',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-base',
};

const SHARED_CONTROL_BASE =
  'w-full border font-mono text-sm transition-colors duration-[var(--ui-motion-duration-fast)] placeholder:text-[color:var(--ui-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50';

export const UI_COMPONENT_SKINS: Record<ThemeName, UiComponentSkin> = {
  cyberpunk: {
    button: {
      base: `${SHARED_BUTTON_BASE} rounded-lg`,
      size: SHARED_BUTTON_SIZES,
      intent: {
        primary:
          'border-[color:var(--ui-action-primary-border)] bg-[color:var(--ui-action-primary-surface)] text-[color:var(--ui-action-primary-text)] hover:bg-[color:var(--ui-action-primary-surface-hover)]',
        secondary:
          'border-white/10 bg-slate-800 text-slate-200 hover:border-cyan-400/40 hover:bg-slate-700',
        danger: 'border-red-400/40 bg-red-600 text-white hover:bg-red-500',
        ghost:
          'border-transparent bg-transparent text-slate-400 hover:bg-white/5 hover:text-white',
      },
      selected:
        'ring-2 ring-[var(--ui-focus-ring)] ring-offset-2 ring-offset-[var(--ui-surface-canvas)]',
    },
    iconButton: {
      base: `${SHARED_BUTTON_BASE} min-h-[44px] min-w-[44px] rounded-lg p-2`,
      intent: {
        primary:
          'border-[color:var(--ui-action-primary-border)] bg-[color:var(--ui-action-primary-surface)] text-[color:var(--ui-action-primary-text)] hover:bg-[color:var(--ui-action-primary-surface-hover)]',
        secondary:
          'border-white/10 bg-slate-800 text-slate-200 hover:border-cyan-400/40 hover:bg-slate-700',
        danger: 'border-red-400/40 bg-red-600 text-white hover:bg-red-500',
        ghost:
          'border-transparent bg-transparent text-slate-400 hover:bg-white/5 hover:text-white',
      },
    },
    control: {
      base: `${SHARED_CONTROL_BASE} min-h-[44px] rounded-lg border-white/10 bg-slate-900/80 px-3 text-slate-100`,
      input: '',
      textarea: 'min-h-28 py-3',
      select: 'appearance-none pr-9',
    },
    panel: {
      base: 'border',
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
      surface: {
        default: 'rounded-lg border-white/10 bg-[color:var(--ui-surface-default)]',
        raised:
          'rounded-lg border-white/15 bg-[color:var(--ui-surface-raised)] shadow-[0_16px_36px_rgba(2,6,23,0.45)]',
        inset: 'rounded-lg border-white/10 bg-[color:var(--ui-surface-inset)]',
      },
    },
    badge: {
      base: 'inline-flex items-center gap-1 rounded-sm border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide',
      tone: {
        neutral: 'border-white/10 bg-white/5 text-slate-300',
        success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
        warning: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
        danger: 'border-red-400/30 bg-red-400/10 text-red-200',
      },
    },
    selectionCard: {
      base: 'group relative inline-flex touch-manipulation overflow-hidden border text-left transition-colors duration-[var(--ui-motion-duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus-ring)]',
      disabled: 'cursor-not-allowed opacity-50',
      selected:
        'border-[color:var(--ui-selection-accent,var(--ui-action-primary-surface))] bg-[color:var(--ui-surface-raised)] ring-1 ring-[color:var(--ui-selection-accent,var(--ui-focus-ring))]',
      selectedVariant: {
        default: '',
        asset:
          '!border-[color:var(--ui-selection-accent)] !bg-[color:color-mix(in_srgb,var(--ui-selection-accent)_18%,var(--ui-surface-raised))] !text-[color:var(--ui-selection-accent)] shadow-[0_8px_20px_-10px_var(--ui-selection-accent)]',
        leverage:
          '!border-[color:var(--ui-selection-accent)] !bg-[color:color-mix(in_srgb,var(--ui-selection-accent)_18%,var(--ui-surface-raised))] !text-[color:var(--ui-selection-accent)] shadow-[0_8px_22px_-8px_var(--ui-selection-accent)]',
        position:
          '!border-[color:var(--ui-selection-accent)] !bg-[color:color-mix(in_srgb,var(--ui-selection-accent)_18%,var(--ui-surface-raised))] !text-[color:var(--ui-selection-accent)] shadow-[0_10px_24px_-10px_var(--ui-selection-accent)]',
      },
      size: {
        compact:
          'min-h-11 min-w-[50px] items-center justify-center px-3 py-2 text-xs leading-none',
        default: 'min-h-14 px-3 py-3',
        large: 'min-h-[88px] px-4 py-4 sm:min-h-24 sm:px-5 sm:py-5',
      },
      tone: {
        neutral:
          'rounded-sm border-white/10 bg-[color:var(--ui-surface-inset)] text-[color:var(--ui-text-primary)]',
        success: 'rounded-sm border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
        danger: 'rounded-sm border-red-400/30 bg-red-400/10 text-red-200',
      },
      variant: {
        default: '',
        asset:
          'rounded-lg border-[color:color-mix(in_srgb,var(--ui-selection-accent)_34%,transparent)] bg-[color:color-mix(in_srgb,var(--ui-selection-accent)_7%,var(--ui-surface-inset))] font-cyber text-[color:var(--ui-selection-accent)] opacity-[0.65] aria-pressed:opacity-100 hover:border-[color:color-mix(in_srgb,var(--ui-selection-accent)_60%,transparent)] hover:opacity-90 disabled:opacity-50',
        leverage:
          'rounded-lg border-[color:color-mix(in_srgb,var(--ui-selection-accent)_32%,transparent)] bg-[color:color-mix(in_srgb,var(--ui-selection-accent)_8%,var(--ui-surface-inset))] font-cyber font-bold tracking-wide text-[color:color-mix(in_srgb,var(--ui-selection-accent)_78%,var(--ui-text-muted))] hover:border-[color:color-mix(in_srgb,var(--ui-selection-accent)_60%,transparent)] hover:text-[color:var(--ui-selection-accent)]',
        position:
          'rounded-lg border-[color:color-mix(in_srgb,var(--ui-selection-accent)_46%,transparent)] bg-[color:color-mix(in_srgb,var(--ui-selection-accent)_10%,var(--ui-surface-inset))] font-cyber font-bold text-[color:var(--ui-selection-accent)] shadow-[0_8px_22px_-12px_var(--ui-selection-accent)] hover:border-[color:var(--ui-selection-accent)] hover:bg-[color:color-mix(in_srgb,var(--ui-selection-accent)_16%,var(--ui-surface-inset))]',
      },
    },
    divider: 'h-px w-full bg-white/10',
    text: {
      h1: 'font-cyber font-bold tracking-tighter uppercase text-[color:var(--ui-text-primary)]',
      h2: 'font-cyber font-semibold tracking-tight text-[color:var(--ui-text-primary)]',
      body: 'font-feed text-[color:var(--ui-text-primary)]',
      mono: 'font-mono text-[color:var(--ui-text-muted)]',
    },
    overlay: {
      backdrop: 'bg-slate-950/80 motion-safe:animate-fade-in',
      decoration:
        'pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent',
      header: 'font-cyber',
      rail: 'font-cyber',
      railLine: 'bg-gradient-to-r from-transparent to-white/10',
      subtitle: 'text-slate-300',
      title: 'font-cyber',
      style: 'war-room',
    },
  },
  'retro-16bit': {
    button: {
      base: `${SHARED_BUTTON_BASE} rounded-none border-2 font-retro-pixel`,
      size: SHARED_BUTTON_SIZES,
      intent: {
        primary:
          'border-[#FFD600] bg-[#00BFFF] text-[#020617] font-black hover:border-[#39FF14] hover:bg-[#39FF14]',
        secondary:
          'border-[#39FF14]/50 bg-[#0a0a12] text-[#39FF14] hover:border-[#39FF14] hover:bg-[#39FF14]/20',
        danger: 'border-[#FF3D00] bg-[#B22222] text-white hover:bg-[#FF3D00]',
        ghost:
          'border-transparent bg-transparent text-[#DCDCDC] hover:bg-[#39FF14]/10 hover:text-[#39FF14]',
      },
      selected: 'ring-2 ring-[#FFD600] ring-offset-2 ring-offset-[#0a0a12]',
    },
    iconButton: {
      base: `${SHARED_BUTTON_BASE} min-h-[44px] min-w-[44px] rounded-none border-2 p-2 font-retro-pixel`,
      intent: {
        primary:
          'border-[#FFD600] bg-[#00BFFF] text-[#020617] hover:border-[#39FF14] hover:bg-[#39FF14]',
        secondary:
          'border-[#39FF14]/50 bg-[#0a0a12] text-[#39FF14] hover:border-[#39FF14] hover:bg-[#39FF14]/20',
        danger: 'border-[#FF3D00] bg-[#B22222] text-white hover:bg-[#FF3D00]',
        ghost:
          'border-transparent bg-transparent text-[#DCDCDC] hover:bg-[#39FF14]/10 hover:text-[#39FF14]',
      },
    },
    control: {
      base: `${SHARED_CONTROL_BASE} min-h-[44px] rounded-none border-2 border-[#39FF14]/50 bg-[#0a0a12] px-3 text-[#DCDCDC]`,
      input: '',
      textarea: 'min-h-28 py-3',
      select: 'appearance-none pr-9',
    },
    panel: {
      base: 'border-2',
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
      surface: {
        default: 'rounded-none border-[#39FF14]/60 bg-[#0a0a12]/95',
        raised:
          'rounded-none border-[#39FF14] bg-[#0a0a12] shadow-[4px_4px_0px_rgba(57,255,20,0.3)]',
        inset: 'rounded-none border-[#39FF14]/30 bg-black/60',
      },
    },
    badge: {
      base: 'inline-flex items-center gap-1 rounded-none border-2 px-2 py-1 font-retro-pixel text-[10px] uppercase',
      tone: {
        neutral: 'border-[#DCDCDC]/50 bg-black/50 text-[#DCDCDC]',
        success: 'border-[#39FF14] bg-[#39FF14]/10 text-[#39FF14]',
        warning: 'border-[#FFD600] bg-[#FFD600]/10 text-[#FFD600]',
        danger: 'border-[#FF3D00] bg-[#B22222]/30 text-white',
      },
    },
    selectionCard: {
      base: 'group relative inline-flex touch-manipulation overflow-hidden border-2 text-left font-retro-pixel transition-colors duration-[var(--ui-motion-duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus-ring)]',
      disabled: 'cursor-not-allowed opacity-50',
      selected:
        'border-[color:var(--ui-selection-accent,var(--ui-action-primary-surface))] bg-[color:var(--ui-surface-raised)] ring-2 ring-[color:var(--ui-selection-accent,var(--ui-focus-ring))]',
      selectedVariant: {
        default: '',
        asset:
          '!border-[color:var(--ui-selection-accent)] !bg-[color:color-mix(in_srgb,var(--ui-selection-accent)_18%,#0a0a12)] !text-[color:var(--ui-selection-accent)] shadow-[3px_3px_0px_color-mix(in_srgb,var(--ui-selection-accent)_55%,transparent)]',
        leverage:
          '!border-[color:var(--ui-selection-accent)] !bg-[#0a0a12] !text-[color:var(--ui-selection-accent)] shadow-[3px_3px_0px_color-mix(in_srgb,var(--ui-selection-accent)_55%,transparent)]',
        position:
          '!border-[color:var(--ui-selection-accent)] !bg-[color:color-mix(in_srgb,var(--ui-selection-accent)_18%,#0a0a12)] !text-[color:var(--ui-selection-accent)] shadow-[3px_3px_0px_color-mix(in_srgb,var(--ui-selection-accent)_65%,transparent)]',
      },
      size: {
        compact:
          'min-h-11 min-w-[50px] items-center justify-center px-3 py-2 text-xs leading-none',
        default: 'min-h-14 px-3 py-3',
        large: 'min-h-[88px] px-4 py-4 sm:min-h-24 sm:px-5 sm:py-5',
      },
      tone: {
        neutral:
          'border-[#39FF14]/40 bg-[color:var(--ui-surface-inset)] text-[#DCDCDC]',
        success: 'border-[#39FF14]/60 bg-[#39FF14]/10 text-[#39FF14]',
        danger: 'border-[#B22222]/60 bg-[#B22222]/10 text-[#FF3D00]',
      },
      variant: {
        default: '',
        asset:
          'border-[color:color-mix(in_srgb,var(--ui-selection-accent)_48%,transparent)] bg-[color:color-mix(in_srgb,var(--ui-selection-accent)_8%,#0a0a12)] text-[color:var(--ui-selection-accent)] opacity-[0.65] aria-pressed:opacity-100 hover:border-[color:var(--ui-selection-accent)] hover:opacity-90 disabled:opacity-50',
        leverage:
          'border-[color:color-mix(in_srgb,var(--ui-selection-accent)_45%,transparent)] bg-black/60 text-[color:color-mix(in_srgb,var(--ui-selection-accent)_70%,#DCDCDC)] hover:border-[color:var(--ui-selection-accent)] hover:text-[color:var(--ui-selection-accent)]',
        position:
          'border-[color:color-mix(in_srgb,var(--ui-selection-accent)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--ui-selection-accent)_10%,#0a0a12)] text-[color:var(--ui-selection-accent)] hover:border-[color:var(--ui-selection-accent)] hover:bg-[color:color-mix(in_srgb,var(--ui-selection-accent)_16%,#0a0a12)]',
      },
    },
    divider: 'h-px w-full bg-[#39FF14]/30',
    text: {
      h1: 'font-retro-pixel font-bold uppercase text-[#FFD600]',
      h2: 'font-retro-pixel font-bold text-[#00BFFF]',
      body: 'font-retro-text text-[#DCDCDC]',
      mono: 'font-mono text-[#39FF14]',
    },
    overlay: {
      backdrop: 'bg-black/90',
      decoration:
        'pointer-events-none absolute left-0 right-0 top-0 h-px bg-[#39FF14]/45',
      header: 'font-retro-pixel',
      rail: 'font-retro-pixel',
      railLine: 'bg-white/20',
      subtitle: 'text-[#DCDCDC]',
      title: 'text-[#FFD600]',
      style: 'arcade',
    },
  },
};
