export const PAGE_SHELL_WIDTHS = {
  narrow: 'max-w-xl',
  standard: 'max-w-4xl',
  wide: 'max-w-7xl',
} as const;

export type PageShellWidth = keyof typeof PAGE_SHELL_WIDTHS;
