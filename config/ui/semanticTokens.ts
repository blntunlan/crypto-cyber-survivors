import { type ThemeName } from '../../types/theme';

export const SEMANTIC_TOKEN_NAMES = [
  'surface.canvas',
  'surface.default',
  'surface.raised',
  'surface.inset',
  'text.primary',
  'text.muted',
  'action.primary.surface',
  'action.primary.surface-hover',
  'action.primary.text',
  'action.primary.border',
  'focus.ring',
  'status.success',
  'status.warning',
  'status.danger',
  'motion.duration-fast',
  'motion.duration-normal',
] as const;

export type SemanticTokenName = (typeof SEMANTIC_TOKEN_NAMES)[number];

export type SemanticTokenSet = Record<SemanticTokenName, string>;

export type ThemeSemanticTokens = Record<ThemeName, SemanticTokenSet>;

export function toSemanticCssVariable(token: SemanticTokenName): string {
  return `--ui-${token.replaceAll('.', '-')}`;
}
